import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserDb } from '@/lib/user-db';
import { bindContractData, fillTemplate } from '@/lib/templateEngine';
import { loadTemplate, generateContractPdf } from '@/lib/contractPdf';
import { readOfficeSettings } from '@/lib/officeSettings';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const db = getUserDb(session.id);

    const { id } = await params;
    const contractId = Number(id);

    if (!contractId || isNaN(contractId) || contractId <= 0) {
      return NextResponse.json({ error: 'Geçersiz ID' }, { status: 400 });
    }

    const contract = await db.contract.findUnique({
      where: { id: contractId },
      include: {
        tenant: true,
        unit: {
          include: {
            property: true,
            owners: {
              include: { owner: true },
              orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
            },
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: 'Sözleşme bulunamadı' }, { status: 404 });
    }

    const office = readOfficeSettings(session.id);

    const data = {
      ...bindContractData({
        tenant:   contract.tenant,
        property: contract.unit.property,
        unit: {
          unitNo:   contract.unit.unitNo,
          floor:    contract.unit.floor,
          type:     contract.unit.type,
          grossSqm: contract.unit.grossSqm,
          netSqm:   contract.unit.netSqm,
          owners:   contract.unit.owners,
        },
        contract: {
          startDate:     contract.startDate,
          endDate:       contract.endDate,
          rentAmount:    contract.rentAmount,
          currentRent:   contract.currentRent,
          currency:      contract.currency,
          paymentDay:    contract.paymentDay,
          depositAmount: contract.depositAmount,
          depositStatus: contract.depositStatus,
          bankName:      contract.bankName,
          iban:          contract.iban,
          accountHolder: contract.accountHolder,
          unitNo:        contract.unit.unitNo,
        },
      }),
      // Office fields — usable as {{officeName}}, {{managerName}}, etc.
      officeName:    office.officeName,
      managerName:   office.managerName,
      officePhone:   office.phone,
      officeEmail:   office.email,
      officeAddress: office.address,
    };

    const template   = loadTemplate();
    const filledText = fillTemplate(template, data);
    const pdfBuffer  = await generateContractPdf(filledText);

    const filename = `sozlesme-${contractId}.pdf`;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      String(pdfBuffer.length),
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}