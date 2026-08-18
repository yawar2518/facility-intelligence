import csv
import io
from rest_framework.renderers import BaseRenderer


class CSVRenderer(BaseRenderer):
    """
    DRF renderer that outputs CSV instead of JSON.
    Usage: add ?format=csv to any endpoint that includes this renderer.
    """
    media_type = 'text/csv'
    format     = 'csv'
    charset    = 'utf-8'

    def render(self, data, accepted_media_type=None, renderer_context=None):
        # Handle paginated responses — extract results list
        if isinstance(data, dict) and 'results' in data:
            data = data['results']

        # Convert to list if needed
        if not isinstance(data, list):
            data = [data]

        if not data:
            return ''

        # Convert OrderedDicts to plain dicts
        rows = [dict(row) for row in data]

        if not rows:
            return ''

        output = io.StringIO()
        writer = csv.DictWriter(
            output,
            fieldnames=rows[0].keys(),
            extrasaction='ignore',
        )
        writer.writeheader()

        for row in rows:
            flat_row = {}
            for key, value in row.items():
                if isinstance(value, dict):
                    flat_row[key] = str(value)
                elif isinstance(value, list):
                    flat_row[key] = ', '.join(str(v) for v in value)
                elif value is None:
                    flat_row[key] = ''
                else:
                    flat_row[key] = value
            writer.writerow(flat_row)

        return output.getvalue()