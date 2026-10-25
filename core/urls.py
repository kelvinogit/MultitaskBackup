from django.urls import path, include
from . import views

app_name = 'core'  

urlpatterns = [
    path('', views.index, name="index"),
    path('dashboard/', views.dashboard, name="dashboard"),


    path('atividades/', views.atividades_list, name='atividade_list'),
    path('atividades/nova/', views.atividade_create, name='atividade_create'),
    path('atividades/<int:pk>/', views.atividade_detail, name='atividade_detail'),
    path('atividades/<int:pk>/editar/', views.atividade_update, name='atividade_update'),
    path('atividades/<int:pk>/finalizar/', views.atividade_finalizar, name='atividade_finalizar'),
    path('atividades/<int:pk>/alternar-conclusao/', views.atividade_alternar_conclusao, name='atividade_alternar_conclusao'),
    path('atividades/<int:pk>/excluir/', views.atividade_delete, name='atividade_delete'),
    path('projetos/', views.projetos_list, name='projeto_list'),
    path('projetos/novo/', views.projeto_create, name='projeto_create'),
    path('projetos/integrante/novo', views.projeto_add_integrante, name='projeto_add_integrante'),
    path('projetos/integrante/<int:pk>/delete', views.projeto_delete_integrante, name='projeto_delete_integrante'),
    path('projetos/<int:pk>/editar', views.projeto_update, name='projeto_update'),
    path('projetos/<int:pk>/delete', views.projeto_delete, name='projeto_delete'),
    path('projetos/<int:pk>/progresso/', views.projeto_atualizar_progresso, name='projeto_atualizar_progresso'),
    path('projetos/<int:pk>/integrantes/novo/', views.projeto_add_integrante_dashboard, name='projeto_add_integrante_dashboard'),
    path('painel/', views.painel_projeto, name='painel_projeto'),
    path('disciplinas/', views.disciplinas_list, name='disciplina_list'),
    path('disciplinas/nova/', views.disciplina_create, name='disciplina_create'),
    path('disciplinas/<int:pk>/excluir', views.disciplina_delete, name='disciplina_delete'),
    path('disciplinas/<int:pk>/editar/', views.disciplina_update, name='disciplina_update'),
    path('notas/', views.notas_amostragen, name='notas_list'),
    path(
        'notas/<int:disciplina_pk>/avaliacoes/nova/',
        views.avaliacao_create,
        name='avaliacao_create',
    ),
    path(
        'notas/avaliacoes/<int:avaliacao_pk>/nota/',
        views.avaliacao_lancar_nota,
        name='avaliacao_lancar_nota',
    ),
]
  
   

