# Ascend - Sistema de XP e Progressao

## Objetivo do balanceamento

O usuario deve sentir progresso diario sem banalizar o Level Up. O inicio precisa ser rapido para gerar aderencia; depois a curva deve desacelerar para valorizar constancia.

## XP por nivel

Formula:

```text
xp_required(level) = round(100 * level^1.55 + level * 35)
```

Exemplos:

- Nivel 1: 135 XP
- Nivel 5: 676 XP
- Nivel 10: 3908 XP
- Nivel 25: 18474 XP
- Nivel 50: 51661 XP

## Recompensa de missao

Formula:

```text
mission_xp = round((35 + difficulty * 28) * streak_multiplier * class_bonus)
```

Dificuldades:

- E: habito simples, 63 XP base.
- D: acao moderada, 91 XP base.
- C: acao intensa, 119 XP base.
- B: missao dificil, 147 XP base.
- A: missao elite, 175 XP base.

## Multiplicador de consistencia

- 0-2 dias: x1.0
- 3-6 dias: x1.1
- 7-13 dias: x1.2
- 14-29 dias: x1.3
- 30+ dias: x1.5

## Bonus de classe

Se a missao usa um atributo foco da classe atual, aplicar x1.1 no XP.

Exemplo:

- Classe Discipulo: Fe + Sabedoria.
- Missao: Orar 20 minutos.
- Atributo: Fe.
- Dificuldade D.
- Streak 9 dias: x1.2.
- Bonus classe: x1.1.
- XP final: round(91 * 1.2 * 1.1) = 120 XP.

## Penalidades

Penalidade nao deve humilhar o usuario; deve chamar de volta.

- Perdeu 1 dia: streak congelado se tiver item "Grace Token".
- Perdeu 2 dias: multiplicador cai 1 faixa.
- Perdeu 3+ dias: surge missao de recuperacao com XP menor, mas alto valor emocional.

Mensagem sugerida:

```text
Alerta: sua disciplina foi negligenciada. Uma missao de recuperacao foi criada.
```

## Ranks

- E: nivel 1-7
- D: nivel 8-14
- C: nivel 15-23
- B: nivel 24-34
- A: nivel 35-49
- S: nivel 50+

## Atributos

Cada missao aumenta o atributo relacionado:

```text
attribute_gain = difficulty
```

Habitos geram +1 no atributo relacionado por check-in valido.

## Recompensas

- Moedas: difficulty * 8.
- Titulo: por marco narrativo.
- Insignia: por conquista rara.
- Skill: por classe + nivel.
- Card compartilhavel: por Level Up, Rank Up e streak.
