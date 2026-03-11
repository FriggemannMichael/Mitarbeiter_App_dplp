import React, { useEffect, useMemo, useState } from "react";
import { Users, PlusCircle, RefreshCw, Save } from "lucide-react";

import { apiService, type AccountDto } from "../../services/apiService";
import { authService } from "../../services/authService";

interface AccountManagementFormProps {
  onSave: (type: "success" | "error" | "warning", message: string) => void;
}

const ROLE_OPTIONS = [
  { value: "dispatcher", label: "Dispatcher" },
  { value: "branch_manager", label: "Branch Manager" },
  { value: "backoffice", label: "Backoffice" },
  { value: "customer_admin", label: "Customer Admin" },
  { value: "platform_owner", label: "Platform Owner" },
];

export const AccountManagementForm: React.FC<AccountManagementFormProps> = ({
  onSave,
}) => {
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, Partial<AccountDto> & { password?: string }>>({});
  const [createForm, setCreateForm] = useState({
    username: "",
    email: "",
    role: "customer_admin",
    password: "",
    is_active: true,
  });

  const currentUser = authService.getCurrentUser();
  const canManagePlatformOwner = currentUser?.role === "platform_owner";
  const visibleRoles = useMemo(
    () =>
      ROLE_OPTIONS.filter((roleOption) =>
        canManagePlatformOwner ? true : roleOption.value !== "platform_owner",
      ),
    [canManagePlatformOwner],
  );

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const response = await apiService.getAccounts();
      if (!response.success) {
        throw new Error(response.error || "Konten konnten nicht geladen werden");
      }
      const items = response.data || [];
      setAccounts(items);
      setDrafts(
        Object.fromEntries(
          items.map((item) => [
            item.id,
            { role: item.role, email: item.email, is_active: item.is_active, password: "" },
          ]),
        ),
      );
    } catch (error) {
      onSave("error", error instanceof Error ? error.message : "Konten konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const response = await apiService.createAccount(createForm);
      if (!response.success) {
        throw new Error(response.error || "Konto konnte nicht erstellt werden");
      }
      onSave("success", "Konto wurde erstellt.");
      setCreateForm({
        username: "",
        email: "",
        role: "customer_admin",
        password: "",
        is_active: true,
      });
      await loadAccounts();
    } catch (error) {
      onSave("error", error instanceof Error ? error.message : "Konto konnte nicht erstellt werden");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (accountId: number) => {
    const draft = drafts[accountId] || {};
    setSavingId(accountId);
    try {
      const response = await apiService.updateAccount(accountId, {
        role: draft.role,
        email: draft.email,
        is_active: draft.is_active,
        password: draft.password || undefined,
      });
      if (!response.success) {
        throw new Error(response.error || "Konto konnte nicht aktualisiert werden");
      }
      onSave("success", "Konto wurde aktualisiert.");
      await loadAccounts();
    } catch (error) {
      onSave("error", error instanceof Error ? error.message : "Konto konnte nicht aktualisiert werden");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Users className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900">Benutzer & Rollen</h2>
          <p className="text-sm text-gray-600 mt-1">
            Verwalten Sie Accounts und Rollen für den aktuellen Mandanten.
          </p>
        </div>
        <button
          type="button"
          onClick={loadAccounts}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Neu laden
        </button>
      </div>

      <form onSubmit={handleCreate} className="bg-gray-50 border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <input
          value={createForm.username}
          onChange={(e) => setCreateForm((prev) => ({ ...prev, username: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg"
          placeholder="username"
          required
        />
        <input
          value={createForm.email}
          onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg"
          placeholder="email@firma.de"
        />
        <select
          value={createForm.role}
          onChange={(e) => setCreateForm((prev) => ({ ...prev, role: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          {visibleRoles.map((roleOption) => (
            <option key={roleOption.value} value={roleOption.value}>
              {roleOption.label}
            </option>
          ))}
        </select>
        <input
          type="password"
          minLength={8}
          value={createForm.password}
          onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
          className="px-3 py-2 border border-gray-300 rounded-lg"
          placeholder="Passwort (min. 8)"
          required
        />
        <button
          type="submit"
          disabled={isCreating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          <PlusCircle className="w-4 h-4" />
          {isCreating ? "Erstellen..." : "Konto erstellen"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-500">Konten werden geladen...</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">Username</th>
                <th className="text-left px-3 py-2">E-Mail</th>
                <th className="text-left px-3 py-2">Rolle</th>
                <th className="text-left px-3 py-2">Aktiv</th>
                <th className="text-left px-3 py-2">Neues Passwort</th>
                <th className="text-left px-3 py-2">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium">{account.username}</td>
                  <td className="px-3 py-2">
                    <input
                      value={drafts[account.id]?.email ?? ""}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [account.id]: { ...prev[account.id], email: e.target.value },
                        }))
                      }
                      className="px-2 py-1 border border-gray-300 rounded w-full"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={drafts[account.id]?.role ?? account.role}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [account.id]: { ...prev[account.id], role: e.target.value },
                        }))
                      }
                      className="px-2 py-1 border border-gray-300 rounded w-full"
                    >
                      {visibleRoles.map((roleOption) => (
                        <option key={roleOption.value} value={roleOption.value}>
                          {roleOption.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={Boolean(drafts[account.id]?.is_active)}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [account.id]: { ...prev[account.id], is_active: e.target.checked },
                        }))
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="password"
                      minLength={8}
                      value={drafts[account.id]?.password ?? ""}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [account.id]: { ...prev[account.id], password: e.target.value },
                        }))
                      }
                      className="px-2 py-1 border border-gray-300 rounded w-full"
                      placeholder="optional"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => handleUpdate(account.id)}
                      disabled={savingId === account.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded hover:bg-black disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {savingId === account.id ? "Speichern..." : "Speichern"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
