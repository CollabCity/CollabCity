import { purgeDueAccounts } from "@/server/account-purge";

/**
 * Expurgo pela linha de comando, para rodar à mão ou em um agendador que tenha
 * acesso ao banco em vez de à aplicação.
 */
async function main() {
  const { purged } = await purgeDueAccounts();
  console.warn(
    purged === 0 ? "Nenhuma conta com prazo vencido." : `${purged} conta(s) expurgada(s).`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Falha ao expurgar contas:", error);
    process.exit(1);
  });
