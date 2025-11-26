import fs from "fs";
import path from "path";
import { Response } from "express";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  setObjectAclPolicy,
  getObjectAclPolicy
} from "./objectAcl";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  private uploadDir: string;

  constructor() {
    // Definir directorio local de subidas en la raíz del proyecto
    this.uploadDir = path.resolve(process.cwd(), "uploads");
    
    // Crear el directorio automáticamente si no existe
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      console.log(`Created local upload directory at: ${this.uploadDir}`);
    }
  }

  // Genera una URL relativa a nuestro propio servidor para subir el archivo
  async getObjectEntityUploadURL(): Promise<string> {
    const objectId = randomUUID();
    // El frontend hará un PUT a http://localhost:5000/api/uploads/{id}
    return `/api/uploads/${objectId}`;
  }

  // Obtiene la ruta física del archivo en el disco
  async getObjectEntityFile(objectPath: string): Promise<string> {
    // Limpiamos la ruta para obtener solo el ID o nombre del archivo
    // Soporta formatos /objects/ID y /api/uploads/ID
    const cleanPath = objectPath.replace(/^\/objects\//, "").replace(/^\/api\/uploads\//, "");
    
    // Construimos la ruta completa segura
    const filePath = path.join(this.uploadDir, cleanPath);

    // Verificamos que exista
    if (!fs.existsSync(filePath)) {
      throw new ObjectNotFoundError();
    }
    return filePath;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    // Si viene una URL completa (http://...), extraemos solo el path
    try {
      if (rawPath.startsWith("http")) {
        const url = new URL(rawPath);
        return url.pathname;
      }
    } catch (e) {
      // Si falla, asumimos que ya es un path relativo
    }
    
    // Normalizamos /api/uploads/ a /objects/ para consistencia interna en base de datos
    if (rawPath.startsWith("/api/uploads/")) {
       return rawPath.replace("/api/uploads/", "/objects/");
    }
    
    return rawPath;
  }

  // Asigna permisos (ACL) a un archivo recién subido
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    // Extraemos el ID del archivo de la ruta
    const id = rawPath.split('/').pop();
    if (!id) throw new Error("Invalid path");

    // Ruta interna normalizada
    const normalizedPath = `/objects/${id}`;
    // Ruta física del archivo
    const filePath = path.join(this.uploadDir, id);
    
    // Guardamos los metadatos de permisos
    await setObjectAclPolicy(filePath, aclPolicy);
    return normalizedPath;
  }

  // Verifica permisos usando el sistema de archivos local
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: string; // Ruta local del archivo
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }

  // Sirve el archivo al cliente (browser)
  async downloadObject(filePath: string, res: Response) {
    try {
       // Leemos permisos para decidir si es caché pública o privada
       const acl = await getObjectAclPolicy(filePath);
       const isPublic = acl?.visibility === 'public';

       res.setHeader(
        "Cache-Control", 
        `${isPublic ? "public" : "private"}, max-age=3600`
       );
       
       // Enviamos el archivo físico
       res.sendFile(filePath);
    } catch (error) {
      console.error("Error serving file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error serving file" });
      }
    }
  }
}