from decimal import Decimal

from django.shortcuts import render

from core.decorators import area_obrigatoria, autenticacao_obrigatoria
from core.models import Atividade, Disciplina, Projeto


TOLERANCIA_RISCO = Decimal('1.0')


def _formatar_nota(valor):
    return f'{valor:.1f}'.replace('.', ',') if valor is not None else '—'


def _iniciais(nome):
    partes = nome.split()
    return ''.join(parte[0] for parte in partes[:2]).upper() if partes else '?'


def _fase_projeto(progresso):
    if progresso < 15:
        return '🌱 Semeadura'
    if progresso < 35:
        return '🌿 Emergência'
    if progresso < 60:
        return '🍃 Vegetativo'
    if progresso < 80:
        return '🌼 Florescimento'
    if progresso < 95:
        return '🌽 Maturação'
    return '🚜 Colheita'


@autenticacao_obrigatoria()
@area_obrigatoria('agro')
def dashboard(request):
    usuario = request.user
    disciplinas = list(
        Disciplina.objects.filter(usuario=usuario).order_by('nome')
    )
    disciplinas_dashboard = []
    medias_disciplinas = []
    disciplinas_em_risco = 0

    for disciplina in disciplinas:
        media = disciplina.media_final
        corte = disciplina.nota_necessaria
        if media is not None:
            medias_disciplinas.append(media)

        if media is None:
            status_nota, status_label = 'sem-notas', 'Sem notas'
        elif corte is None:
            status_nota, status_label = 'sem-corte', 'Sem corte definido'
        elif media >= corte:
            status_nota, status_label = 'no-alvo', 'No alvo'
        elif media >= corte - TOLERANCIA_RISCO:
            status_nota, status_label = 'atencao', 'Atenção'
        else:
            status_nota, status_label = 'em-risco', 'Em risco'
            disciplinas_em_risco += 1

        disciplinas_dashboard.append({
            'disciplina': disciplina,
            'media_texto': _formatar_nota(media),
            'media_percentual': max(0, min(100, float(media * 10))) if media is not None else 0,
            'corte_texto': _formatar_nota(corte),
            'corte_percentual': max(0, min(100, float(corte * 10))) if corte is not None else None,
            'tem_corte': corte is not None,
            'status_nota': status_nota,
            'status_label': status_label,
        })

    media_geral = (
        sum(medias_disciplinas, Decimal('0')) / len(medias_disciplinas)
        if medias_disciplinas else None
    )

    atividades = Atividade.objects.filter(usuario=usuario)
    total_atividades = atividades.count()
    atividades_concluidas_count = atividades.filter(
        status=Atividade.Status.CONCLUIDA
    ).count()
    percentual_conclusao = (
        round(atividades_concluidas_count * 100 / total_atividades)
        if total_atividades else 0
    )
    atividades_concluidas = list(
        atividades.filter(status=Atividade.Status.CONCLUIDA)
        .select_related('disciplina')
        .order_by('-prazo')[:6]
    )

    projetos = list(
        Projeto.objects.filter(responsavel=usuario)
        .prefetch_related('participacoes')
        .order_by('prazo', 'nome')
    )
    projetos_ativos = [
        projeto for projeto in projetos
        if projeto.status != Projeto.Status.CONCLUIDO
    ]
    progresso_medio = (
        round(sum(projeto.progresso for projeto in projetos_ativos) / len(projetos_ativos))
        if projetos_ativos else 0
    )
    projetos_dashboard = []
    for projeto in projetos:
        progresso = projeto.progresso
        if progresso >= 80:
            faixa_progresso = 'alto'
        elif progresso >= 50:
            faixa_progresso = 'medio'
        else:
            faixa_progresso = 'baixo'

        participantes = [
            {
                'nome': integrante.usuario,
                'iniciais': _iniciais(integrante.usuario),
            }
            for integrante in projeto.participacoes.all()
        ]
        projetos_dashboard.append({
            'projeto': projeto,
            'faixa_progresso': faixa_progresso,
            'fase': _fase_projeto(progresso),
            'participantes': participantes,
        })

    context = {
        'curso': usuario.curso,
        'media_geral': _formatar_nota(media_geral),
        'disciplinas_dashboard': disciplinas_dashboard,
        'disciplinas_em_risco': disciplinas_em_risco,
        'total_disciplinas': len(disciplinas_dashboard),
        'atividades_concluidas': atividades_concluidas,
        'atividades_concluidas_count': atividades_concluidas_count,
        'atividades_pendentes_count': total_atividades - atividades_concluidas_count,
        'total_atividades': total_atividades,
        'percentual_conclusao': percentual_conclusao,
        'projetos_dashboard': projetos_dashboard,
        'progresso_medio': progresso_medio,
        'projetos_ativos_count': len(projetos_ativos),
    }
    return render(request, 'agronomico/index.html', context)
