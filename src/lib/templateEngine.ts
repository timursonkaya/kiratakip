/**
 * Template engine for contract PDF generation.
 *
 * API:
 *   bindContractData({ tenant, property, contract })  -> flat field map
 *   fillTemplate(template, data)                      -> filled string
 *
 * Ownership is per-unit now. bindContractData accepts an optional
 * `unit.owners` array (UnitOwner with included `owner`) and resolves
 * the primary owner from it. If the caller passes a legacy
 * `property.owner`, it's used as a fallback.
 *
 * Every value in the returned map is a string, ready to substitute into
 * {{placeholder}} tokens. Unknown placeholders are left untouched.
 */

export type TemplateOwner = {
  name: string;
  phone?: string | null;
  email?: string | null;
  nationalId?: string | null;
  address?: string | null;
};

export type BindInput = {
  tenant?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    nationalId?: string | null;
    address?: string | null;
  } | null;
  property?: {
    title?: string | null;
    address?: string | null;
    city?: string | null;
    district?: string | null;
    type?: string | null;
    owner?: TemplateOwner | null; // legacy fallback
  } | null;
  unit?: {
    unitNo?: string | null;
    floor?: number | null;
    type?: string | null;
    grossSqm?: number | null;
    netSqm?: number | null;
    owners?: Array<{ owner: TemplateOwner; isPrimary?: boolean }>;
  } | null;
  contract?: {
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    rentAmount?: number | null;
    currentRent?: number | null;
    currency?: string | null;
    paymentDay?: number | null;
    depositAmount?: number | null;
    depositStatus?: string | null;
    accountHolder?: string | null;
    bankName?: string | null;
    iban?: string | null;
    unitNo?: string | null; // legacy convenience field
  } | null;
};

const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function toDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateTR(v: Date | string | null | undefined): string {
  const d = toDate(v);
  if (!d) return '';
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatMoney(n: number | null | undefined, currency = 'TRY'): string {
  if (n == null || Number.isNaN(n)) return '';
  const locale = currency === 'TRY' ? 'tr-TR' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Resolve a flat map of {{placeholder}} -> string values.
 * Office fields can be spread on top by the caller.
 */
export function bindContractData(input: BindInput): Record<string, string> {
  const { tenant, property, unit, contract } = input;

  const owners = unit?.owners ?? [];
  const primaryOwner =
    owners.find(o => o.isPrimary)?.owner ??
    owners[0]?.owner ??
    property?.owner ??
    null;

  const startDate = toDate(contract?.startDate);
  const endDate   = toDate(contract?.endDate);
  const currency  = contract?.currency ?? 'TRY';
  const rent      = contract?.rentAmount ?? 0;

  const today = new Date();

  return {
    // owner
    'ownerName':        primaryOwner?.name        ?? '',
    'ownerPhone':       primaryOwner?.phone       ?? '',
    'ownerEmail':       primaryOwner?.email       ?? '',
    'ownerNationalId':  primaryOwner?.nationalId  ?? '',
    'ownerAddress':     primaryOwner?.address     ?? '',

    // property
    'propertyTitle':    property?.title    ?? '',
    'propertyAddress':  property?.address  ?? '',
    'propertyCity':     property?.city     ?? '',
    'propertyDistrict': property?.district ?? '',
    'propertyType':     property?.type     ?? '',

    // unit
    'unitNo':           unit?.unitNo ?? contract?.unitNo ?? '',
    'unitFloor':        unit?.floor   != null ? String(unit.floor)   : '',
    'unitType':         unit?.type    ?? '',
    'unitGrossSqm':     unit?.grossSqm != null ? String(unit.grossSqm) : '',
    'unitNetSqm':       unit?.netSqm   != null ? String(unit.netSqm)   : '',

    // tenant
    'tenantName':       tenant?.name       ?? '',
    'tenantPhone':      tenant?.phone      ?? '',
    'tenantEmail':      tenant?.email      ?? '',
    'tenantNationalId': tenant?.nationalId ?? '',
    'tenantAddress':    tenant?.address    ?? '',

    // contract
    'startDate':        formatDateTR(startDate),
    'endDate':          formatDateTR(endDate),
    'rentAmount':       rent != null ? String(rent) : '',
    'rentAmountFormatted': formatMoney(rent, currency),
    'currentRent':      contract?.currentRent != null ? String(contract.currentRent) : '',
    'currency':         currency,
    'paymentDay':       contract?.paymentDay != null ? String(contract.paymentDay) : '',
    'depositAmount':    contract?.depositAmount != null ? String(contract.depositAmount) : '',
    'depositAmountFormatted': formatMoney(contract?.depositAmount, currency),
    'depositStatus':    contract?.depositStatus ?? '',
    'accountHolder':    contract?.accountHolder ?? '',
    'bankName':         contract?.bankName      ?? '',
    'iban':             contract?.iban          ?? '',

    // misc
    'today':            formatDateTR(today),
  };
}

/**
 * Substitute {{placeholder}} tokens with data values.
 * Unknown placeholders are left untouched (helps spot typos).
 */
export function fillTemplate(
  template: string,
  data: Record<string, string>
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : match;
  });
}

/**
 * Optional richer API used by other callers: a typed TemplateContext +
 * renderTemplate. Kept for pages/components that prefer structured input.
 */
export type TemplateContext = {
  owner: TemplateOwner | null;
  property: BindInput['property'];
  unit: BindInput['unit'];
  tenant: BindInput['tenant'];
  contract: BindInput['contract'];
};

export function renderTemplate(template: string, ctx: TemplateContext): string {
  return fillTemplate(template, bindContractData(ctx));
}