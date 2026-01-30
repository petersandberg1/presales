export type AuthUser = {
  id: string;
  username: string;
  displayName: string;
};

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; message: string };

export interface AuthProvider {
  authenticate(username: string, password: string): Promise<AuthResult>;
}