from django.urls import path, include
from . import views

app_name = 'core'  

urlpatterns = [
    path('index/', views.index, name="index"),
    path('dashboard/', views.dashboard, name="dashboard"),
]