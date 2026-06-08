# Generated manually — add is_removed to Video

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0006_youtubeoauthtoken"),
    ]

    operations = [
        migrations.AddField(
            model_name="video",
            name="is_removed",
            field=models.BooleanField(default=False),
        ),
    ]
