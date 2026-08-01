export function mapAuthError(message: string | undefined): string {
  const m = (message || '').toLowerCase();

  if (m.includes('username') && (m.includes('unique') || m.includes('duplicate') || m.includes('already'))) {
    return 'Ce nom d utilisateur est deja pris';
  }
  if (m.includes('username_required')) {
    return 'Le nom d utilisateur est requis (3 caracteres minimum)';
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'Un compte existe deja avec cet email';
  }
  if (m.includes('invalid login credentials') || m.includes('invalid credentials')) {
    return 'Email ou mot de passe incorrect';
  }
  if (m.includes('email not confirmed')) {
    return 'Email non confirme. Verifie ta boite mail.';
  }
  if (m.includes('password') && m.includes('at least')) {
    return 'Le mot de passe doit contenir au moins 6 caracteres';
  }
  if (m.includes('unable to validate email') || m.includes('invalid email')) {
    return 'Adresse email invalide';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Trop de tentatives. Reessaie dans un instant.';
  }

  return message?.trim() || 'Une erreur est survenue';
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length < 3) return 'Le nom d utilisateur doit faire au moins 3 caracteres';
  if (trimmed.length > 24) return 'Le nom d utilisateur doit faire au plus 24 caracteres';
  if (!/^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
    return 'Lettres, chiffres, _ et - uniquement';
  }
  return null;
}
