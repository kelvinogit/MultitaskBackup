from django.urls import path, include
from . import views

app_name = 'core'  

urlpatterns = [
    path('', views.index, name="index"),
    path('dashboard/', views.dashboard, name="dashboard"),


    path('atividades/', views.atividades_list, name='atividade_list'),
   # path('atividades/nova/', views.atividade_create, name='atividade_create'),
    #path('atividades/<int:pk>/editar/', views.atividade_update, name='atividade_update'),
    #path('atividades/<int:pk>/excluir/', views.atividade_delete, name='atividade_delete'),
    
]