export interface AdminUser {
  id: string;
  email: string | null;
  display_name: string | null;
  weight_unit: 'kg' | 'lbs';
  is_approved: boolean;
  is_admin: boolean;
  approved_at: string | null;
  created_at: string;
}

export interface AdminUsersResponse {
  pending: AdminUser[];
  approved: AdminUser[];
  totalPending: number;
  totalApproved: number;
}

export const adminService = {
  async getUsers(): Promise<AdminUsersResponse> {
    const res = await fetch('/api/admin/users', {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store',
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Impossibile recuperare l\'elenco degli utenti');
    }

    return res.json();
  },

  async approveUser(userId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/admin/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Errore durante l\'approvazione dell\'utente');
    }

    return data;
  },

  async revokeUser(userId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/admin/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Errore durante la revoca dell\'approvazione');
    }

    return data;
  },

  async rejectUser(userId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/admin/reject', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Errore durante l\'eliminazione dell\'account');
    }

    return data;
  },
};
