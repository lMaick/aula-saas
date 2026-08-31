const knownMessages: Record<string, string> = {
  invalid_credentials: "E-mail ou senha inválidos.",
  email_in_use: "Não foi possível criar a conta com esse e-mail.",
  invalid_form: "Revise os dados informados e tente novamente.",
  recovery_failed: "Não foi possível enviar o link de recuperação.",
  reset_failed: "Não foi possível redefinir a senha.",
  profile_failed: "Não foi possível salvar o perfil.",
  expired_link: "O link é inválido ou expirou. Solicite um novo.",
  student_invalid: "Revise os dados do aluno e tente novamente.",
  student_create_failed: "Não foi possível cadastrar o aluno.",
  student_update_failed: "Não foi possível atualizar o aluno.",
};

export function authErrorMessage(code: string) {
  return knownMessages[code] ?? "Não foi possível concluir a operação.";
}
