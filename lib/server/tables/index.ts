export {
  createTableConfig,
  deleteTableConfig,
  getTableConfig,
  listTableConfigs,
  ReservedTableNameError,
  TableNotFoundError,
  updateTableConfig,
} from "./repository";
export type {
  CreateTableInput,
  FieldMetadata,
  LabelFieldConfig,
  RelationshipConfig,
  RLSPolicyGroup,
  RLSPolicyTemplate,
  TableConfig,
  TableId,
  TableRecord,
  UpdateTableInput,
  VersioningConfig,
} from "./schema";
