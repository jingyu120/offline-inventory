import { useCallback, useState } from 'react';
import axios, { AxiosError } from 'axios';
import { guardAsync } from '@burma-inventory/shared-types';
import { API_BASE_URL } from '../../../config/appConfig';
import { useTranslation } from '../../../core/i18n/i18n';
import { OdooImportResult } from '../types';

const ODOO_IMPORT_ENDPOINT = `${API_BASE_URL}/sync/import-odoo`;

interface OdooImportErrorBody {
  error?: string;
}

export interface UseOdooImporterReturn {
  csvText: string;
  setCsvText: (value: string) => void;
  importing: boolean;
  importResult: OdooImportResult | null;
  submitImport: () => Promise<void>;
  clear: () => void;
}

interface UseOdooImporterArgs {
  onImportSuccess: () => void;
}

/**
 * Encapsulates the Odoo CSV importer network call and result state. The screen
 * supplies an `onImportSuccess` callback so it can refresh dependent data
 * (database entities + sync audit logs) after a successful import.
 */
export const useOdooImporter = ({
  onImportSuccess,
}: UseOdooImporterArgs): UseOdooImporterReturn => {
  const { t } = useTranslation();
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<OdooImportResult | null>(
    null,
  );

  const submitImport = useCallback(async (): Promise<void> => {
    if (!csvText.trim()) {
      return;
    }
    setImporting(true);
    setImportResult(null);

    const [response, error] = await guardAsync(
      axios.post<OdooImportResult>(ODOO_IMPORT_ENDPOINT, {
        csvData: csvText,
      }),
    );

    if (error) {
      const axiosError = error as AxiosError<OdooImportErrorBody>;
      setImportResult({
        success: false,
        error:
          axiosError.response?.data?.error ||
          axiosError.message ||
          t('importFailed'),
      });
      setImporting(false);
      return;
    }

    setImportResult(response.data);
    if (response.data.success) {
      setCsvText('');
      onImportSuccess();
    }
    setImporting(false);
  }, [csvText, onImportSuccess, t]);

  const clear = useCallback(() => {
    setCsvText('');
    setImportResult(null);
  }, []);

  return {
    csvText,
    setCsvText,
    importing,
    importResult,
    submitImport,
    clear,
  };
};
