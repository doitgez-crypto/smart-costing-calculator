import { EXCEL_ROW_MAP, ExcelMapItem } from "./excel-map";

export type FieldConfigState = {
  [id: string]: {
    isVisible: boolean;
    isInput: boolean; // false = output
  };
};

export function getFieldsFromConfig(
  configs: FieldConfigState,
  legacySettings?: { inputRows?: number[], outputRows?: number[], monthlyRows?: number[], percentageRows?: number[] }
) {
  let finalConfigs = configs;

  // Migration from V1 if configs are empty
  if (!configs || Object.keys(configs).length === 0) {
    finalConfigs = {};
    if (legacySettings) {
      const inputs = new Set([...(legacySettings.inputRows || []), ...(legacySettings.monthlyRows || [])]);
      const outputs = new Set(legacySettings.outputRows || []);
      const percentages = new Set(legacySettings.percentageRows || []);

      Object.values(EXCEL_ROW_MAP).forEach(f => {
        if (inputs.has(f.rowIndex)) {
          finalConfigs[f.id] = { isVisible: true, isInput: true };
        } else if (outputs.has(f.rowIndex)) {
          finalConfigs[f.id] = { isVisible: true, isInput: false };
        }
      });
    }
  }

  const inputs: any[] = [];
  const outputs: any[] = [];

  Object.values(EXCEL_ROW_MAP).forEach((field) => {
    const conf = finalConfigs[field.id];
    if (conf && conf.isVisible) {
      const obj = {
        ...field,
        value: "0"
      };
      if (conf.isInput) {
        inputs.push(obj);
      } else {
        outputs.push(obj);
      }
    }
  });

  // Sort them by original row index to maintain logical order
  inputs.sort((a, b) => a.rowIndex - b.rowIndex);
  outputs.sort((a, b) => a.rowIndex - b.rowIndex);

  return { inputs, outputs };
}
