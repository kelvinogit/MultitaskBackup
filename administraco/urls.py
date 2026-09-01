from django.urls import path
from . import views

urlpatterns = [
    path('admindash/', views.admin_dashboard, name="admindash"),
]
