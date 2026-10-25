from decimal import Decimal

from django.shortcuts import render
from django.urls import reverse

from core.decorators import area_obrigatoria, autenticacao_obrigatoria
from core.forms import ParticipacaoProjetoForm
from core.models import Atividade, Disciplina, Projeto


TOLERANCIA_RISCO = Decimal('1.0')


def _formatar_nota(valor):
    return f'{valor:.1f}'.replace('.', ',') if valor is not None else '—'


def _iniciais(nome):
    partes = nome.split()
    return ''.join(parte[0] for parte in partes[:2]).upper() if partes else '?'


@autenticacao_obrigatoria()
@area_obrigatoria('admin')
def admin_dashboard(request):
    disciplinas = (
        Disciplina.objects
        .filter(usuario=request.user)
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
            status_nota = 'sem-notas'
            status_label = 'Sem notas'
        elif corte is None:
            status_nota = 'sem-corte'
            status_label = 'Sem corte definido'
        elif media >= corte:
            status_nota = 'no-alvo'
            status_label = 'No alvo'
        elif media >= corte - TOLERANCIA_RISCO:
            status_nota = 'atencao'
            status_label = 'Atenção'
        else:
            status_nota = 'em-risco'
            status_label = 'Em risco'
            disciplinas_em_risco += 1

        disciplinas_dashboard.append({
            'disciplina': disciplina,
            'media': media,
            'media_texto': _formatar_nota(media),
            'media_percentual': max(0, min(100, float(media * 10))) if media is not None else 0,
            'corte': corte,
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

    atividades = list(
        Atividade.objects
        .filter(usuario=request.user)
        .select_related('disciplina')
        .order_by('prazo')
    )
    atividades_concluidas = sum(
        atividade.status == Atividade.Status.CONCLUIDA for atividade in atividades
    )
    atividades_pendentes = len(atividades) - atividades_concluidas
    percentual_conclusao = (
        round(atividades_concluidas * 100 / len(atividades)) if atividades else 0
    )

    projetos = list(
        Projeto.objects
        .filter(responsavel=request.user)
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
                'id': integrante.pk,
                'nome': integrante.usuario,
                'iniciais': _iniciais(integrante.usuario),
                'tarefa': integrante.tarefa,
                'delete_url': reverse(
                    'core:projeto_delete_integrante',
                    kwargs={'pk': integrante.pk},
                ),
            }
            for integrante in projeto.participacoes.all()
        ]
        formulario_integrante = ParticipacaoProjetoForm(
            responsavel=request.user,
            prefix=f'integrante-{projeto.pk}',
            initial={'projeto': projeto},
        )
        formulario_integrante.fields['projeto'].widget = formulario_integrante.fields['projeto'].hidden_widget()
        formulario_integrante.fields['usuario'].widget.attrs['placeholder'] = 'Nome do integrante'
        formulario_integrante.fields['tarefa'].widget.attrs['placeholder'] = 'Função ou tarefa (opcional)'
        projetos_dashboard.append({
            'projeto': projeto,
            'participantes': participantes,
            'faixa_progresso': faixa_progresso,
            'formulario_integrante': formulario_integrante,
            'url_progresso': reverse(
                'core:projeto_atualizar_progresso',
                kwargs={'pk': projeto.pk},
            ),
            'url_integrantes': reverse(
                'core:projeto_add_integrante_dashboard',
                kwargs={'pk': projeto.pk},
            ),
        })

    context = {
        'curso': request.user.curso,
        'media_geral': _formatar_nota(media_geral),
        'media_geral_numero': float(media_geral) if media_geral is not None else None,
        'disciplinas_dashboard': disciplinas_dashboard,
        'disciplinas_em_risco': disciplinas_em_risco,
        'total_disciplinas': len(disciplinas_dashboard),
        'atividades_dashboard': atividades,
        'atividades_concluidas': atividades_concluidas,
        'atividades_pendentes': atividades_pendentes,
        'total_atividades': len(atividades),
        'percentual_conclusao': percentual_conclusao,
        'projetos_dashboard': projetos_dashboard,
        'progresso_medio': progresso_medio,
        'projetos_ativos_count': len(projetos_ativos),
    }

    return render(request, 'admin/index.html', context)
