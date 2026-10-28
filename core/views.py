from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from .models import Curso, Atividade, Projeto, Disciplina, ParticipacaoProjeto, Avaliacao
from django.contrib.auth.decorators import login_required
from . decorators import autenticacao_obrigatoria
from .forms import (
    DisciplinaForm,
    AtividadesForm,
    ProjetoForm,
    ParticipacaoProjetoForm,
    AvaliacaoForm,
    LancarNotaForm,
)
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.utils import timezone
from decimal import Decimal, ROUND_HALF_UP
from django.db.models import Avg



AREA_TEMPLATE_PREFIX = {
    'admin': 'admin',
    'contabeis': 'contabeis',
    'agro': 'agronomico',
}


def get_template(usuario, view_name):
    """
    Retorna a lista de candidatos a template para uma view genérica do
    core, na ordem: template específico da área do usuário -> template
    genérico do core (fallback, usado enquanto a área ainda não tem
    tela própria).

    Ex.: get_template(usuario_do_agro, 'atividade_list')
         -> ['agronomico/atividade_list.html', 'core/atividade_list.html']
    """


    curso = getattr(usuario, 'curso', None)
    slug = getattr(curso, 'slug', None)
    prefixo = AREA_TEMPLATE_PREFIX.get(slug)


    candidatos=[]
    if prefixo:
        candidatos.append(f'{prefixo}/{view_name}.html')
    candidatos.append(f'core/{view_name}.html')
    return candidatos

def index(request):
    curso = Curso.objects.all()
    context = {
        'cursos': curso
    }
    return render(request, 'index.html', context)



def get_dashboard_context (usuario):
    """
    Calcula a seção fixa do dashboard (contagens por status + próximas
    atividades) para um usuário. Deve ser chamada por qualquer view de
    dashboard de área (administraco, contabeis, agronomico) e combinada
    com o bloco condicional específico daquela área.
    """

    atividades = Atividade.objects.filter(usuario=usuario)
    contagem = {
        'pendentes': atividades.filter(status=Atividade.Status.PENDENTE).count(),
        'andamento': atividades.filter(status=Atividade.Status.ANDAMENTO).count(),
        'concluidas': atividades.filter(status=Atividade.Status.CONCLUIDA).count(),
        'atrasadas': atividades.filter(status=Atividade.Status.ATRASADA).count(),
    }
    contagem['total'] = sum(contagem.values())

    proximas_atividades = (
        atividades
        .exclude(status=Atividade.Status.CONCLUIDA)
        .order_by('prazo')[:5]
    )

    return{
        'contagem_atividades':contagem,
        'proximas_atividades': proximas_atividades,
    }


def recalcular_media_final(disciplina):
    media = disciplina.disciplinas_notas.filter(
        nota__isnull=False,
    ).aggregate(media=Avg('nota'))['media']
    disciplina.media_final = (
        media.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        if media is not None else None
    )
    disciplina.save(update_fields=['media_final'])
    return disciplina.media_final

@autenticacao_obrigatoria()
def dashboard(request):
    curso = request.user.curso

    if curso is None:
        return render(request, 'index.html')

    destino = {
        'contabeis': 'contabeis:dashboard',
        'agro': 'agronomico:dashboard',
        'admin': 'administraco:admindash',
    }.get(curso.slug)

    if destino is None:
        # slug não mapeado — cai num dashboard genérico do core em vez de quebrar
        return render(request, 'index.html', {'curso': curso})

    return redirect(destino)


# Atividades ---- CRUD e LIST

@login_required
def atividades_list(request):
    atividades = Atividade.objects.filter(usuario=request.user).select_related('disciplina')

    for atividade in atividades:
        atividade.sincronizar_status_atraso()

    context ={
        'atividades':atividades,
    }   
    return render(request, get_template(request.user, 'atividades_list'), context)


@login_required
def atividade_create(request):
    if request.method == 'POST':
        form = AtividadesForm(request.POST, usuario=request.user)
        if form.is_valid():
            atividade = form.save(commit=False)
            atividade.usuario = request.user
            atividade.save()
            return redirect('core:atividade_list')
    else:
        form = AtividadesForm(usuario=request.user)

    context = {
        'form': form,
    }
    return render(request, get_template(request.user, 'atividade_form'), context)


@login_required
def atividade_detail(request, pk):
    """
    Retorna os dados de uma atividade em JSON, pra preencher o modal
    de visualização/edição sem recarregar a página.
    """
    atividade = get_object_or_404(Atividade, pk=pk, usuario=request.user)

    prazo_local = timezone.localtime(atividade.prazo) if atividade.prazo else None

    data = {
        'id': atividade.pk,
        'titulo': atividade.titulo,
        'descricao': atividade.descricao,
        'disciplina_id': atividade.disciplina_id,
        'tipo': atividade.tipo,
        'prazo': prazo_local.strftime('%Y-%m-%dT%H:%M') if prazo_local else '',
        'prioridade': atividade.prioridade,
        'status': atividade.status,
        'observacoes': atividade.observacoes,
        'choices': {
            'tipo': list(Atividade.Tipo.choices),
            'prioridade': list(Atividade.Prioridade.choices),
            'status': list(Atividade.Status.choices),
        },
        'disciplinas': list(
            Disciplina.objects.filter(usuario=request.user).values('id', 'nome')
        ),
    }
    return JsonResponse(data)


@login_required
@require_POST
def atividade_update(request, pk):
    """
    Atualiza uma atividade existente (inclui a troca de status) via JSON,
    usado pelo formulário dentro do modal.
    """
    atividade = get_object_or_404(Atividade, pk=pk, usuario=request.user)
    form = AtividadesForm(request.POST, instance=atividade, usuario=request.user)

    if form.is_valid():
        atividade = form.save()
        prazo_local = timezone.localtime(atividade.prazo) if atividade.prazo else None
        return JsonResponse({
            'ok': True,
            'atividade': {
                'id': atividade.pk,
                'titulo': atividade.titulo,
                'disciplina_nome': atividade.disciplina.nome if atividade.disciplina else '',
                'prazo_exibicao': prazo_local.strftime('%d/%m/%Y %H:%M') if prazo_local else '',
                'status': atividade.status,
                'status_display': atividade.get_status_display(),
            },
        })

    return JsonResponse({'ok': False, 'errors': form.errors}, status=400)


@login_required
@require_POST
def atividade_finalizar(request, pk):
    """
    Finaliza uma atividade do usuário autenticado sem exigir o envio de
    todos os campos do formulário de edição.
    """
    atividade = get_object_or_404(Atividade, pk=pk, usuario=request.user)

    if atividade.status != Atividade.Status.CONCLUIDA:
        atividade.status = Atividade.Status.CONCLUIDA
        atividade.save(update_fields=['status'])

    return JsonResponse({
        'ok': True,
        'atividade': {
            'id': atividade.pk,
            'status': atividade.status,
            'status_display': atividade.get_status_display(),
        },
    })


@login_required
@require_POST
def atividade_alternar_conclusao(request, pk):
    atividade = get_object_or_404(Atividade, pk=pk, usuario=request.user)
    atividade.status = (
        Atividade.Status.PENDENTE
        if atividade.status == Atividade.Status.CONCLUIDA
        else Atividade.Status.CONCLUIDA
    )
    atividade.save(update_fields=['status'])

    atividades = Atividade.objects.filter(usuario=request.user)
    total = atividades.count()
    concluidas = atividades.filter(status=Atividade.Status.CONCLUIDA).count()
    return JsonResponse({
        'ok': True,
        'finalizada': atividade.status == Atividade.Status.CONCLUIDA,
        'concluidas': concluidas,
        'total': total,
        'percentual': round(concluidas * 100 / total) if total else 0,
    })


@login_required
@require_POST
def atividade_delete(request, pk):
    atividade = get_object_or_404(Atividade, pk=pk, usuario=request.user)
    atividade.delete()
    return JsonResponse({'ok': True})


@login_required
def projetos_list(request):
    projetos = (
        Projeto.objects
        .filter(responsavel=request.user)
        .distinct()
        .order_by('prazo')
    )
 
    context = {
        'projetos': projetos,
        'status_choices':Projeto.Status.choices,

    }
    return render(request, get_template(request.user, 'projetos_list'), context)


@login_required
def projeto_create(request):
    if request.method == 'POST':
        form = ProjetoForm(request.POST)
        
        if form.is_valid():
            projeto = form.save(commit=False)
            projeto.responsavel = request.user
            projeto.definir_progresso()
            projeto.save()
            return redirect('core:projeto_list')
    else:
        form = ProjetoForm()

    context = {
        'form': form,
    }
    return render(request, get_template(request.user, 'projeto_form'), context)


@login_required
@require_POST
def projeto_update(request, pk):
    projeto = get_object_or_404(Projeto, pk=pk)
    form = ProjetoForm(request.POST, instance=projeto)

    if not form.is_valid():
        return JsonResponse({
                'ok': False, "erros":form.errors})

    projeto = form.save(commit=False)
    projeto.definir_progresso()
    projeto.save()
    progresso = projeto.progresso

    return JsonResponse(
        {
            "ok": True,
            "projeto":{
                "id":projeto.id,
                "nome":projeto.nome,
                "feitos":projeto.feitos,
                "descricao":projeto.descricao,
                "status": projeto.status,
                "status_display": projeto.get_status_display(),
                "progresso":progresso,
            },
        }
    )


@login_required
@require_POST
def projeto_atualizar_progresso(request, pk):
    projeto = get_object_or_404(Projeto, pk=pk, responsavel=request.user)
    try:
        progresso = int(request.POST.get('progresso', ''))
    except (TypeError, ValueError):
        return JsonResponse({'ok': False, 'error': 'Informe um percentual válido.'}, status=400)

    if not 0 <= progresso <= 100:
        return JsonResponse({'ok': False, 'error': 'O progresso deve estar entre 0 e 100.'}, status=400)

    projeto.progresso = progresso
    projeto.save(update_fields=['progresso'])

    projetos_ativos = (
        Projeto.objects
        .filter(responsavel=request.user)
        .exclude(status=Projeto.Status.CONCLUIDO)
    )
    media_progresso = projetos_ativos.aggregate(media=Avg('progresso'))['media'] or 0
    return JsonResponse({
        'ok': True,
        'progresso': projeto.progresso,
        'media_progresso': round(media_progresso),
        'projetos_ativos': projetos_ativos.count(),
    })

@login_required
def painel_projeto(request):
    projeto = Projeto.objects.filter(responsavel=request.user)
    integrantes = ParticipacaoProjeto.objects.filter(projeto__in=projeto)
    context = {'projeto':projeto,
               'integrantes':integrantes}

    return render(request, get_template(request.user, 'projeto_painel'), context) 

@login_required
def projeto_add_integrante(request):
    form = ParticipacaoProjetoForm(request.POST, responsavel=request.user)

    if request.method == 'POST' and form.is_valid():
        form.save()
        return redirect('core:projeto_add_integrante')
    context = {
        'form':form
    }
    return render(request, get_template(request.user, 'projeto_integrante_form'), context)

@login_required
@require_POST
def projeto_delete_integrante(request, pk):
    integrante = get_object_or_404(
        ParticipacaoProjeto,
        pk=pk,
        projeto__responsavel=request.user,
    )
    integrante.delete()
    return JsonResponse({'ok' : True})


@login_required
@require_POST
def projeto_add_integrante_dashboard(request, pk):
    projeto = get_object_or_404(Projeto, pk=pk, responsavel=request.user)
    prefix = f'integrante-{projeto.pk}'
    form = ParticipacaoProjetoForm(
        request.POST,
        responsavel=request.user,
        prefix=prefix,
    )

    if form.is_valid() and form.cleaned_data['projeto'].pk == projeto.pk:
        integrante = form.save()
        iniciais = ''.join(
            parte[0] for parte in integrante.usuario.split()[:2] if parte
        ).upper()
        return JsonResponse({
            'ok': True,
            'integrante': {
                'id': integrante.pk,
                'nome': integrante.usuario,
                'iniciais': iniciais or integrante.usuario[:1].upper(),
                'tarefa': integrante.tarefa,
                'delete_url': reverse(
                    'core:projeto_delete_integrante',
                    kwargs={'pk': integrante.pk},
                ),
            },
        })

    if form.is_valid():
        form.add_error('projeto', 'Selecione o projeto correto para adicionar o integrante.')

    return JsonResponse({
        'ok': False,
        'errors': form.errors.get_json_data(),
    }, status=400)

    
@login_required
@require_POST
def projeto_delete(request, pk):
    projeto = get_object_or_404(Projeto, pk=pk)
    projeto.delete()
    return JsonResponse({'ok': True})

    


# Disciplinas ---- List e Create

@login_required
def disciplinas_list(request):
    disciplinas = Disciplina.objects.filter(usuario=request.user)

    context = {
        'disciplinas': disciplinas,
    }
    return render(request, get_template(request.user, 'disciplinas_list'), context)


@login_required
def disciplina_create(request):
    if request.method == 'POST':
        form = DisciplinaForm(request.POST)
        if form.is_valid():
            disciplina = form.save(commit=False)
            disciplina.usuario = request.user
            disciplina.save()
            return redirect('core:disciplina_list')
    else:
        form = DisciplinaForm()

    context = {
        'form': form,
    }
    return render(request, get_template(request.user, 'disciplina_form'), context)


@login_required
@require_POST
def disciplina_delete(request, pk):
    disciplina = get_object_or_404(Disciplina, pk=pk, usuario=request.user)
    disciplina.delete()

    return JsonResponse({'ok': True})


@login_required
@require_POST
def disciplina_update(request, pk):
    """
    Atualiza uma DISCIPLINA  existente (inclui a troca de status) via JSON,
    usado pelo formulário dentro do modal.
    """
    disciplina = get_object_or_404(Disciplina, pk=pk, usuario=request.user)
    form = DisciplinaForm(request.POST, instance=disciplina)

    if form.is_valid():
        disciplina = form.save()
        return JsonResponse({
            'ok': True,
            'disciplina': {
                'id': disciplina.pk,
                'nome': disciplina.nome,
                'semestre': disciplina.semestre,
                'professor':disciplina.professor,
                'descricao':disciplina.descricao,
            },
        })

    return JsonResponse({'ok': False, 'errors': form.errors}, status=400)

@login_required
def notas_amostragen(request):
    disciplinas = (
        Disciplina.objects
        .filter(usuario=request.user)
        .prefetch_related('disciplinas_notas')
    )
    disciplinas_notas = []

    for disciplina in disciplinas:
        avaliacoes = list(disciplina.disciplinas_notas.all())
        lancadas = [avaliacao for avaliacao in avaliacoes if avaliacao.nota is not None]
        pendentes = [avaliacao for avaliacao in avaliacoes if avaliacao.nota is None]

        peso_total = sum((avaliacao.peso for avaliacao in lancadas), Decimal('0'))
        if peso_total:
            media_atual = (
                sum(
                    (avaliacao.nota * avaliacao.peso for avaliacao in lancadas),
                    Decimal('0'),
                ) / peso_total
            ).quantize(Decimal('0.01'))
        else:
            media_atual = None

        nota_necessaria = disciplina.nota_necessaria
        if nota_necessaria is not None and nota_necessaria > Decimal('10'):
            situacao = 'Meta inviável'
        elif (
            media_atual is not None
            and nota_necessaria is not None
            and media_atual >= nota_necessaria
        ):
            situacao = 'Meta atingida'
        else:
            situacao = 'Em andamento'

        disciplinas_notas.append({
            'disciplina': disciplina,
            'avaliacoes': avaliacoes,
            'avaliacao_form': AvaliacaoForm(
                disciplina=disciplina,
                prefix=f'avaliacao-{disciplina.pk}',
            ),
            'media_atual': media_atual,
            'tem_media': media_atual is not None,
            'quantidade_lancadas': len(lancadas),
            'quantidade_pendentes': len(pendentes),
            'situacao': situacao,
        })

    return render(request, get_template(request.user, 'lancamento_notas'), {
        'disciplinas_notas': disciplinas_notas,
    })


@login_required
@require_POST
def avaliacao_create(request, disciplina_pk):
    disciplina = get_object_or_404(
        Disciplina,
        pk=disciplina_pk,
        usuario=request.user,
    )
    form = AvaliacaoForm(
        request.POST,
        disciplina=disciplina,
        prefix=f'avaliacao-{disciplina.pk}',
    )

    if form.is_valid():
        avaliacao = form.save()
        recalcular_media_final(disciplina)
        return JsonResponse({
            'ok': True,
            'avaliacao': {
                'id': avaliacao.pk,
                'nome': avaliacao.nome,
            },
        })

    return JsonResponse({
        'ok': False,
        'errors': form.errors.get_json_data(),
    }, status=400)


@login_required
@require_POST
def avaliacao_lancar_nota(request, avaliacao_pk):
    avaliacao = get_object_or_404(
        Avaliacao.objects.select_related('disciplina_id'),
        pk=avaliacao_pk,
        disciplina_id__usuario=request.user,
        nota__isnull=True,
    )
    form = LancarNotaForm(request.POST, instance=avaliacao)

    if form.is_valid():
        avaliacao = form.save()
        recalcular_media_final(avaliacao.disciplina_id)
        return JsonResponse({
            'ok': True,
            'nota': str(avaliacao.nota),
        })

    return JsonResponse({
        'ok': False,
        'errors': form.errors.get_json_data(),
    }, status=400)
















