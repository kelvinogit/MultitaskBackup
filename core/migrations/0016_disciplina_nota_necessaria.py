from decimal import Decimal

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0015_alter_avaliacao_unique_together_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='disciplina',
            name='nota_necessaria',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=5,
                null=True,
                validators=[django.core.validators.MinValueValidator(Decimal('0'))],
                verbose_name='Nota necessária',
            ),
        ),
    ]
