from django.urls import path
from . import views

app_name = 'administraco'

urlpatterns = [
    path('admindash/', views.admin_dashboard, name="admindash"),
    
]
