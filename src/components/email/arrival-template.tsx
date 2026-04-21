import * as React from 'react';

interface ArrivalEmailTemplateProps {
  clientName: string;
  shipmentId: string;
  destinationAddress: string;
  driverName?: string;
  vehiclePlate?: string;
}

export function ArrivalEmailTemplate({
  clientName,
  shipmentId,
  destinationAddress,
  driverName = "Asignado",
  vehiclePlate = "S/P",
}: ArrivalEmailTemplateProps) {
  return (
    <div style={{ backgroundColor: '#f8fafc', padding: '40px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)', border: '1px solid #f1f5f9' }}>
            
            {/* Header / Logo Section */}
            <div style={{ backgroundColor: '#000000', padding: '32px', textAlign: 'center' }}>
                <h1 style={{ color: '#ffffff', margin: 0, fontSize: '20px', fontWeight: 300, letterSpacing: '4px', textTransform: 'uppercase' }}>
                    VORIAN <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>LOGISTICS</span>
                </h1>
            </div>

            {/* Content Body */}
            <div style={{ padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ display: 'inline-block', backgroundColor: '#eff6ff', color: '#3b82f6', padding: '8px 16px', borderRadius: '100px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '16px' }}>
                        ● ARRIVANDO
                    </div>
                    <h2 style={{ color: '#0f172a', fontSize: '24px', fontWeight: '800', margin: '0 0 8px 0' }}>¡Ya estamos cerca!</h2>
                    <p style={{ color: '#64748b', fontSize: '16px', margin: 0 }}>Hola {clientName}, tu carga está a menos de 300 metros.</p>
                </div>

                {/* Info Tiles - The "Glass" Grid */}
                <div style={{ display: 'table', width: '100%', borderCollapse: 'separate', borderSpacing: '12px', margin: '0 -12px 32px -12px' }}>
                    <div style={{ display: 'table-row' }}>
                        <div style={{ display: 'table-cell', width: '50%', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                            <p style={{ margin: '0 0 4px 0', color: '#94a3b8', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Patente</p>
                            <p style={{ margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: 'bold' }}>{vehiclePlate}</p>
                        </div>
                        <div style={{ display: 'table-cell', width: '50%', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                            <p style={{ margin: '0 0 4px 0', color: '#94a3b8', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ID Carga</p>
                            <p style={{ margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: 'bold' }}>#{shipmentId.substring(0, 8)}</p>
                        </div>
                    </div>
                    <div style={{ display: 'table-row' }}>
                        <div style={{ display: 'table-cell', width: '50%', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                            <p style={{ margin: '0 0 4px 0', color: '#94a3b8', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Conductor</p>
                            <p style={{ margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: 'bold' }}>{driverName}</p>
                        </div>
                        <div style={{ display: 'table-cell', width: '50%', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                            <p style={{ margin: '0 0 4px 0', color: '#94a3b8', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ETA</p>
                            <p style={{ margin: 0, color: '#10b981', fontSize: '16px', fontWeight: 'bold' }}>&lt; 2 min</p>
                        </div>
                    </div>
                </div>

                {/* Destination Bar */}
                <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #f1f5f9', marginBottom: '32px' }}>
                    <p style={{ margin: '0 0 8px 0', color: '#94a3b8', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>📍 Punto de Entrega</p>
                    <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: '1.4' }}>{destinationAddress}</p>
                </div>

                {/* CTA Button */}
                <div style={{ textAlign: 'center' }}>
                    <a href={`https://vorianglobal.com/tracking/${shipmentId}`} style={{ display: 'block', backgroundColor: '#3b82f6', color: '#ffffff', padding: '18px 32px', borderRadius: '14px', fontSize: '16px', fontWeight: 'bold', textDecoration: 'none', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)' }}>
                        Gestionar descarga en vivo
                    </a>
                </div>
            </div>

            {/* Footer */}
            <div style={{ backgroundColor: '#f8fafc', padding: '24px 40px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px' }}>
                    Recibes este aviso por ser el contacto logístico de este envío.<br/>© 2026 Vorian Global S.A.
                </p>
            </div>
        </div>
    </div>
  );
}
