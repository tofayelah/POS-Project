export interface Supplier {
  id: number | string;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  contact_person?: string;
  is_active?: boolean;
}
