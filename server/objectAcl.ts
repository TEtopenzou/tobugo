import fs from "fs/promises";
import path from "path";

// --- Tipos y Interfaces (Sin cambios) ---
export enum ObjectAccessGroupType {
  USER = "user",
  TRIP_COLLABORATOR = "trip_collaborator"
}

export interface ObjectAccessGroup {
  type: ObjectAccessGroupType;
  id: string;
}

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export interface ObjectAclRule {
  group: ObjectAccessGroup;
  permission: ObjectPermission;
}

export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
  aclRules?: Array<ObjectAclRule>;
}

// Lógica de Permisos
function isPermissionAllowed(
  requested: ObjectPermission,
  granted: ObjectPermission,
): boolean {
  if (requested === ObjectPermission.READ) {
    return [ObjectPermission.READ, ObjectPermission.WRITE].includes(granted);
  }
  return granted === ObjectPermission.WRITE;
}

abstract class BaseObjectAccessGroup implements ObjectAccessGroup {
  constructor(
    public readonly type: ObjectAccessGroupType,
    public readonly id: string,
  ) {}
  public abstract hasMember(userId: string): Promise<boolean>;
}

class UserAccessGroup extends BaseObjectAccessGroup {
  public async hasMember(userId: string): Promise<boolean> {
    return this.id === userId;
  }
}

class TripCollaboratorAccessGroup extends BaseObjectAccessGroup {
  public async hasMember(userId: string): Promise<boolean> {
    return false; // Simplificado para local
  }
}

function createObjectAccessGroup(group: ObjectAccessGroup): BaseObjectAccessGroup {
  switch (group.type) {
    case ObjectAccessGroupType.USER:
      return new UserAccessGroup(group.type, group.id);
    case ObjectAccessGroupType.TRIP_COLLABORATOR:
      return new TripCollaboratorAccessGroup(group.type, group.id);
    default:
      throw new Error(`Unknown access group type: ${group.type}`);
  }
}

// --- IMPLEMENTACIÓN DE SISTEMA DE ARCHIVOS LOCAL ---

// Ayudante para obtener la ruta del archivo de metadatos (.meta.json)
function getMetaPath(filePath: string): string {
  return `${filePath}.meta.json`;
}

// Guarda la política ACL en un archivo JSON local junto al archivo original
export async function setObjectAclPolicy(
  filePath: string,
  aclPolicy: ObjectAclPolicy,
): Promise<void> {
  try {
    // Verificamos si el archivo existe antes de guardar metadatos
    await fs.access(filePath); 
    const metaPath = getMetaPath(filePath);
    await fs.writeFile(metaPath, JSON.stringify(aclPolicy, null, 2));
  } catch (error) {
    // Si el archivo no existe o falla la escritura, lanzamos error
    throw new Error(`Object not found or error writing metadata: ${filePath}`);
  }
}

// Lee la política ACL desde el archivo JSON local
export async function getObjectAclPolicy(
  filePath: string,
): Promise<ObjectAclPolicy | null> {
  try {
    const metaPath = getMetaPath(filePath);
    const data = await fs.readFile(metaPath, 'utf-8');
    return JSON.parse(data) as ObjectAclPolicy;
  } catch (error) {
    return null; // Si no hay archivo meta, asumimos sin política
  }
}

// Verifica si el usuario tiene acceso (leyendo el JSON local)
export async function canAccessObject({
  userId,
  objectFile, // En modo local, esto es la ruta del archivo (string)
  requestedPermission,
}: {
  userId?: string;
  objectFile: string;
  requestedPermission: ObjectPermission;
}): Promise<boolean> {
  const aclPolicy = await getObjectAclPolicy(objectFile);
  
  // Si no hay política, denegar por defecto (o permitir si prefieres abierto en dev)
  if (!aclPolicy) {
    return false; 
  }

  // Acceso público
  if (
    aclPolicy.visibility === "public" &&
    requestedPermission === ObjectPermission.READ
  ) {
    return true;
  }

  // Requiere usuario
  if (!userId) {
    return false;
  }

  // Dueño siempre tiene acceso
  if (aclPolicy.owner === userId) {
    return true;
  }

  // Verificar reglas específicas
  for (const rule of aclPolicy.aclRules || []) {
    const accessGroup = createObjectAccessGroup(rule.group);
    if (
      (await accessGroup.hasMember(userId)) &&
      isPermissionAllowed(requestedPermission, rule.permission)
    ) {
      return true;
    }
  }

  return false;
}