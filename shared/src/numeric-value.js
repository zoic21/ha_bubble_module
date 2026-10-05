const numeric = value => value != null && String(value).trim() !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
