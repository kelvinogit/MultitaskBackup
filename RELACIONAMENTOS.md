# Relacionamentos entre os dados

Este documento resume os relacionamentos definidos em `accounts/models.py` e `core/models.py`.

## Visão geral

```text
Curso 1 ─── N Usuário
Usuário 1 ─── N Disciplina
Usuário 1 ─── N Atividade
Usuário 1 ─── N Projeto (responsável)
Disciplina 1 ─── N Avaliação
Disciplina 0..1 ─── N Atividade
Projeto 1 ─── N ParticipaçãoProjeto
```

Atividade também pode apontar opcionalmente para um objeto de outro módulo por meio de uma relação genérica.

## Entidades

- **Curso:** possui nome e slug. Um curso pode estar associado a vários usuários.
- **Usuário:** possui nome, e-mail único e curso opcional. O curso usa `PROTECT`, portanto não pode ser excluído enquanto houver usuários associados.
- **Disciplina:** pertence a um usuário e guarda professor, semestre, descrição, média final e nota necessária. A média final é atualizada pelo fluxo de notas.
- **Atividade:** pertence a um usuário e pode estar associada a uma disciplina. Tem tipo, prioridade, prazo e status. A disciplina é opcional.
- **Avaliação:** pertence a uma disciplina pelo campo relacional `disciplina_id`. Guarda nome, nota opcional, peso e data. O nome é único dentro da disciplina.
- **Projeto:** pertence a um usuário responsável e guarda status, prazo e progresso.
- **ParticipaçãoProjeto:** pertence a um projeto e registra o nome do integrante como texto, além de sua tarefa. O nome do integrante não é uma chave estrangeira para Usuário e é único dentro do projeto.

## Exclusões e observações

- Excluir uma disciplina remove suas avaliações e atividades associadas, devido ao `CASCADE`.
- Excluir um projeto remove suas participações.
- Excluir o usuário responsável remove suas disciplinas, atividades e projetos associados.
- O vínculo genérico de Atividade usa `ContentType` e `object_id`; ele não cria uma chave estrangeira fixa para cada tipo de objeto.
- Não existe vínculo direto entre Projeto e Atividade nos models atuais.
