import { Tenant } from './types';

export interface TenantBehaviorResult {
  tenant: Tenant | null;
  isSignButtonHidden: boolean;
  skipsCancelConfirmation: boolean;
  isIGV: boolean;
}

export function useTenantBehavior(tenantId: string): TenantBehaviorResult {
  const numericId = Number(tenantId);
  const tenant = Object.values(Tenant).includes(numericId)
    ? (numericId as Tenant)
    : null;
  const isSignButtonHidden =
    tenant === Tenant.WSTV || tenant === Tenant.MyDonau;
  const skipsCancelConfirmation = tenant === Tenant.Graz;
  const isIGV = tenant === Tenant.IGV;
  return { tenant, isSignButtonHidden, skipsCancelConfirmation, isIGV };
}
