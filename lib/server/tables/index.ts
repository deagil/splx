export {
  listTableConfigs,
  getTableConfig,
  createTableConfig,
  updateTableConfig,
  deleteTableConfig,
  TableNotFoundError,
  ReservedTableNameError,
} from "./repository";
export type {
  TableRecord,
  TableId,
  LabelFieldConfig,
  RelationshipConfig,
  FieldMetadata,
  RLSPolicyTemplate,
  RLSPolicyGroup,
  VersioningConfig,
  TableConfig,
  CreateTableInput,
  UpdateTableInput,
} from "./schema";

