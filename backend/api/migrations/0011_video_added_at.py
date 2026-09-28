from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0010_video_description"),
    ]

    operations = [
        migrations.AddField(
            model_name="video",
            name="added_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
