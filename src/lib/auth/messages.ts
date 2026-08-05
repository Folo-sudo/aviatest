export function mapAuthError(message: string | undefined): string {
  const m = (message || '').toLowerCase();

  if (m.includes('username') && (m.includes('unique') || m.includes('duplicate') || m.includes('already'))) {
    return "Ce nom d’utilisateur est déjà pris";
  }
  if (m.includes('username_required')) {
    return "Le nom d’utilisateur est requis (3 caractères minimum)";
  }
  if (m.includes('username_too_long')) {
    return "Le nom d’utilisateur doit faire au plus 24 caractères";
  }
  if (m.includes('username_invalid')) {
    return 'Lettres, chiffres, _ et - uniquement';
  }
  if (m.includes('username_already_set')) {
    return 'Ton pseudo est déjà défini';
  }
  if (m.includes('username_taken') || m.includes('username_already')) {
    return "Ce nom d’utilisateur est déjà pris";
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'Un compte existe déjà avec cet e-mail';
  }
  if (m.includes('invalid login credentials') || m.includes('invalid credentials')) {
    return 'E-mail ou mot de passe incorrect';
  }
  if (m.includes('email not confirmed')) {
    return 'E-mail non confirmé. Vérifie ta boîte mail.';
  }
  if (m.includes('password') && m.includes('at least')) {
    return 'Le mot de passe doit contenir au moins 12 caractères';
  }
  if (m.includes('unable to validate email') || m.includes('invalid email')) {
    return 'Adresse e-mail invalide';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Trop de tentatives. Réessaie dans un instant.';
  }
  if (m.includes('oauth') || m.includes('provider') || m.includes('exchange')) {
    return 'Connexion Google impossible. Réessaie ou utilise ton e-mail / mot de passe.';
  }

  return message?.trim() || 'Une erreur est survenue';
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length < 3) return "Le nom d’utilisateur doit faire au moins 3 caractères";
  if (trimmed.length > 24) return "Le nom d’utilisateur doit faire au plus 24 caractères";
  if (!/^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
    return 'Lettres, chiffres, _ et - uniquement';
  }
  return null;
}
