from django.urls import path
from . import  views

urlpatterns = [
    path('contabeis/', views.contabeis, name="contabeis"),
]