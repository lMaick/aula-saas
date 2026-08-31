const knownMessages: Record<string, string> = {
  invalid_credentials: "E-mail ou senha inválidos.",
  email_in_use: "Não foi possível criar a conta com esse e-mail.",
  invalid_form: "Revise os dados informados e tente novamente.",
  recovery_failed: "Não foi possível enviar o link de recuperação.",
  reset_failed: "Não foi possível redefinir a senha.",
  profile_failed: "Não foi possível salvar o perfil.",
  expired_link: "O link é inválido ou expirou. Solicite um novo.",
};

export function authErrorMessage(code: string) {
  return knownMessages[code] ?? "Não foi possível concluir a operação.";
}
