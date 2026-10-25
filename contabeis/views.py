
# Create your views here.

from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.shortcuts import render
from django.utils import timezone

from core.decorators import area_obrigatoria, autenticacao_obrigatoria
from core.models import Atividade, Disciplina, Projeto


TOLERANCIA_RISCO = Decimal('1.0')


def _formatar(valor, casas=1):
    if valor is None:
        return '—'
    valor = valor.quantize(Decimal('1').scaleb(-casas), rounding=ROUND_HALF_UP)
    return f'{valor:.{casas}f}'.replace('.', ',')


def _formatar_saldo(valor):
    if valor is None:
        return '—'
    valor = valor.quantize(Decimal('0.1'), rounding=ROUND_HALF_UP)
    if valor < 0:
        return f'({_formatar(abs(valor))})'
    return _formatar(valor)


def _iniciais(nome):
    partes = nome.split()
    return ''.join(parte[0] for parte in partes[:2]).upper() if partes else '?'


@autenticacao_obrigatoria()
@area_obrigatoria('contabeis')
def dashboard(request):
    usuario = request.user
    disciplinas = Disciplina.objects.filter(usuario=usuario).order_by('nome')
    balancete = []
    medias_disponiveis = []
    soma_medias = Decimal('0')
    soma_cortes = Decimal('0')
    disciplinas_comparaveis = 0

    for disciplina in disciplinas:
        media = disciplina.media_final
        corte = disciplina.nota_necessaria
        if media is not None:
            medias_disponiveis.append(media)

        saldo = media - corte if media is not None and corte is not None else None
        if saldo is not None:
            soma_medias += media
            soma_cortes += corte
            disciplinas_comparaveis += 1
            if saldo >= 0:
                situacao = 'Solvente'
                classe_situacao = 'solvente'
            elif saldo >= -TOLERANCIA_RISCO:
                situacao = 'Atenção'
                classe_situacao = 'atencao'
            else:
                situacao = 'Déficit'
                classe_situacao = 'deficit'
            saldo_classe = 'positivo' if saldo >= 0 else 'negativo'
        else:
            situacao = 'Sem nota' if media is None else 'Sem corte'
            classe_situacao = 'incompleto'
            saldo_classe = 'indisponivel'

        balancete.append({
            'disciplina': disciplina,
            'corte_texto': _formatar(corte) if corte is not None else 'Sem corte',
            'media_texto': _formatar(media) if media is not None else 'Sem nota',
            'saldo_texto': _formatar_saldo(saldo),
            'saldo_classe': saldo_classe,
            'situacao': situacao,
            'classe_situacao': classe_situacao,
            'motivo_indisponivel': (
                'Sem nota e sem corte' if media is None and corte is None
                else 'Sem nota' if media is None
                else 'Sem corte'
            ) if saldo is None else '',
        })

    media_geral = (
        sum(medias_disponiveis, Decimal('0')) / len(medias_disponiveis)
        if medias_disponiveis else None
    )
    indice_solvencia = soma_medias / soma_cortes if soma_cortes else None

    atividades = list(
        Atividade.objects.filter(usuario=usuario)
        .select_related('disciplina')
        .order_by('prazo', 'titulo')
    )
    agora = timezone.now()
    limite_circulante = agora + timedelta(days=7)
    atividades_concluidas = []
    passivo_circulante = []
    passivo_nao_circulante = []

    for atividade in atividades:
        atividade.atrasada_dashboard = (
            atividade.status == Atividade.Status.ATRASADA
            or atividade.prazo < agora
        )
        atividade.prazo_texto = timezone.localtime(atividade.prazo).strftime('%d/%m/%Y %H:%M')
        if atividade.status == Atividade.Status.CONCLUIDA:
            atividades_concluidas.append(atividade)
        elif atividade.prazo <= limite_circulante or atividade.atrasada_dashboard:
            passivo_circulante.append(atividade)
        else:
            passivo_nao_circulante.append(atividade)

    projetos = list(
        Projeto.objects.filter(responsavel=usuario)
        .prefetch_related('participacoes')
        .order_by('prazo', 'nome')
    )
    projetos_ativos = [
        projeto for projeto in projetos
        if projeto.status != Projeto.Status.CONCLUIDO
    ]
    execucao_media = (
        round(sum(projeto.progresso for projeto in projetos_ativos) / len(projetos_ativos))
        if projetos_ativos else 0
    )
    projetos_dashboard = []
    for projeto in projetos:
        projeto.participantes_dashboard = [
            {
                'nome': integrante.usuario,
                'iniciais': _iniciais(integrante.usuario),
            }
            for integrante in projeto.participacoes.all()
        ]
        projeto.a_executar = 100 - projeto.progresso
        projetos_dashboard.append(projeto)

    if indice_solvencia is None:
        indice_solvencia_texto = '—'
        indice_solvencia_resumo = (
            'Sem disciplinas com média e corte definidos.'
            if not disciplinas_comparaveis
            else 'Não é possível calcular: soma dos cortes igual a zero.'
        )
    else:
        indice_solvencia_texto = _formatar(indice_solvencia, casas=2)
        indice_solvencia_resumo = (
            'Acima da meta no conjunto (≥ 1,0)'
            if indice_solvencia >= 1
            else 'Abaixo da meta no conjunto (< 1,0)'
        )

    context = {
        'curso': usuario.curso,
        'balancete': balancete,
        'disciplinas_comparaveis': disciplinas_comparaveis,
        'total_cortes': _formatar(soma_cortes) if disciplinas_comparaveis else '—',
        'total_medias': _formatar(soma_medias) if disciplinas_comparaveis else '—',
        'saldo_total': _formatar_saldo(soma_medias - soma_cortes) if disciplinas_comparaveis else '—',
        'saldo_total_classe': (
            'indisponivel' if not disciplinas_comparaveis
            else 'positivo' if soma_medias >= soma_cortes
            else 'negativo'
        ),
        'media_geral': _formatar(media_geral),
        'indice_solvencia': indice_solvencia_texto,
        'indice_solvencia_resumo': indice_solvencia_resumo,
        'atividades_concluidas': atividades_concluidas,
        'passivo_circulante': passivo_circulante,
        'passivo_nao_circulante': passivo_nao_circulante,
        'total_atividades': len(atividades),
        'execucao_media': execucao_media,
        'projetos_dashboard': projetos_dashboard,
        'projetos_ativos_count': len(projetos_ativos),
    }
    return render(request, 'contabeis/index.html', context)
