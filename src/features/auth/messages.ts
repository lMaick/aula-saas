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
  lesson_invalid: "Revise os dados da aula e tente novamente.",
  lesson_student_invalid: "Selecione um aluno ativo da sua conta.",
  lesson_conflict: "Já existe uma aula agendada nesse horário.",
  lesson_create_failed: "Não foi possível agendar a aula.",
  lesson_update_failed: "Não foi possível remarcar a aula.",
  lesson_not_scheduled: "Essa ação só está disponível para aulas agendadas.",
  recurrence_invalid: "Revise os dados do horário fixo.",
  recurrence_student_invalid: "Somente alunos ativos da sua conta podem receber um horário fixo.",
  recurrence_conflict: "Existem aulas conflitantes com esse horário nas próximas 8 semanas.",
  recurrence_not_found: "O horário fixo não existe ou já está inativo.",
  recurrence_save_failed: "Não foi possível salvar o horário fixo.",
};

export function authErrorMessage(code: string) {
  return knownMessages[code] ?? "Não foi possível concluir a operação.";
}
