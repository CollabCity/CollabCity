/** Resultado de uma Server Action, consumido por `useActionState`. */
export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** Mensagens de validação por campo, no formato produzido pelo Zod. */
  errors?: Record<string, string[]>;
};

export const idleState: ActionState = { status: "idle" };

export function errorState(message: string, errors?: Record<string, string[]>): ActionState {
  return { status: "error", message, errors };
}

export function successState(message: string): ActionState {
  return { status: "success", message };
}
