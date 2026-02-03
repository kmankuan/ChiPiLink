"""
Shared utility functions for ChiPi Link
"""
from datetime import datetime
from difflib import SequenceMatcher
from typing import Optional, List


def get_current_school_year() -> str:
    """Get current school year string (e.g., '2025-2026')"""
    now = datetime.now()
    # School year starts in February/March typically
    if now.month >= 2:
        return f"{now.year}-{now.year + 1}"
    return f"{now.year - 1}-{now.year}"


def calcular_similitud(texto1: str, texto2: str) -> float:
    """Calculate similarity ratio between two strings (0.0 to 1.0)"""
    if not texto1 or not texto2:
        return 0.0
    # Normalize: lowercase and strip whitespace
    t1 = texto1.lower().strip()
    t2 = texto2.lower().strip()
    return SequenceMatcher(None, t1, t2).ratio()


def buscar_estudiante_en_matriculas(
    nombre: str, 
    apellido: str, 
    grado: str, 
    db_sync_estudiantes: list
) -> Optional[dict]:
    """
    Search for a student in the synced enrollment database.
    Returns match info if similarity >= 90%, otherwise None.
    """
    nombre_completo = f"{nombre} {apellido}".lower().strip()
    mejor_coincidencia = None
    mejor_similitud = 0.0
    
    for est_sync in db_sync_estudiantes:
        datos = est_sync.get("datos", {})
        
        # Try to find name fields in the synced data
        sync_nombre = ""
        sync_apellido = ""
        sync_grado = ""
        
        # Look for mapped or common field names
        for key, value in datos.items():
            key_lower = key.lower()
            value_str = str(value).strip() if value else ""
            
            if "nombre" in key_lower and "apellido" not in key_lower:
                sync_nombre = value_str
            elif "apellido" in key_lower:
                sync_apellido = value_str
            elif "grade" in key_lower or "grade" in key_lower or "class" in key_lower:
                sync_grado = value_str
            # Also check for full name field
            elif "student" in key_lower and "name" in key_lower:
                # Could be full name, split it
                parts = value_str.split()
                if len(parts) >= 2:
                    sync_nombre = parts[0]
                    sync_apellido = " ".join(parts[1:])
                else:
                    sync_nombre = value_str
        
        # Calculate similarity
        sync_nombre_completo = f"{sync_nombre} {sync_apellido}".lower().strip()
        
        # Compare full names
        similitud_nombre = calcular_similitud(nombre_completo, sync_nombre_completo)
        
        # Also compare individual fields
        similitud_nombre_ind = calcular_similitud(nombre, sync_nombre)
        similitud_apellido = calcular_similitud(apellido, sync_apellido)
        
        # Use the best approach
        similitud_combinada = max(
            similitud_nombre,
            (similitud_nombre_ind + similitud_apellido) / 2
        )
        
        # Check grade match (more flexible)
        grado_match = False
        if sync_grado:
            # Normalize grades for comparison (handle "4", "4to", "4to Grado", etc.)
            grado_norm = grado.lower().replace("grade", "").replace("°", "").strip()
            sync_grado_norm = sync_grado.lower().replace("grade", "").replace("°", "").replace("th", "").replace("st", "").replace("nd", "").replace("rd", "").strip()
            
            # Try numeric comparison
            try:
                if grado_norm.isdigit() and sync_grado_norm.isdigit():
                    grado_match = grado_norm == sync_grado_norm
                else:
                    grado_match = calcular_similitud(grado_norm, sync_grado_norm) >= 0.8
            except:
                grado_match = calcular_similitud(grado, sync_grado) >= 0.8
        
        # Calculate final score (name similarity is most important, grade is secondary)
        # If grade doesn't match, reduce the score significantly
        if grado_match:
            score_final = similitud_combinada
        else:
            score_final = similitud_combinada * 0.5  # Penalize if grade doesn't match
        
        if score_final > mejor_similitud:
            mejor_similitud = score_final
            mejor_coincidencia = {
                "sync_id": est_sync.get("sync_id"),
                "datos": datos,
                "similitud": round(score_final * 100, 1),
                "nombre_encontrado": sync_nombre_completo,
                "grado_encontrado": sync_grado,
                "grado_match": grado_match
            }
    
    # Return match if >= 90% similarity
    if mejor_similitud >= 0.9:
        return mejor_coincidencia
    
    return None
