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
    <div style={{ backgroundColor: '#09090b', padding: '40px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#18181b', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)', border: '1px solid #27272a' }}>
            
            {/* Header / Logo Section */}
            <div style={{ backgroundColor: '#09090b', padding: '32px 40px', borderBottom: '1px solid #27272a', textAlign: 'left' }}>
                <table width="100%" border={0} cellPadding={0} cellSpacing={0}>
                  <tr>
                    <td>
                      <img 
                        src="https://www.vorianglobal.com/vorianwhite.png" 
                        alt="Vorian Global Logo" 
                        height="36" 
                        style={{ height: '36px', width: 'auto', display: 'block' }} 
                      />
                    </td>
                    <td align="right">
                      <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '6px 14px', borderRadius: '100px', fontSize: '11px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>
                        ● APROXIMÁNDOSE
                      </span>
                    </td>
                  </tr>
                </table>
            </div>

            {/* Content Body */}
            <div style={{ padding: '40px' }}>
                <div style={{ marginBottom: '32px' }}>
                    <h2 style={{ color: '#ffffff', fontSize: '24px', fontWeight: '800', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
                      ¡Transportista cerca del punto!
                    </h2>
                    <p style={{ color: '#a1a1aa', fontSize: '15px', margin: 0, lineHeight: '1.5' }}>
                      Hola <strong style={{ color: '#ffffff' }}>{clientName}</strong>, el vehículo logístico se encuentra a menos de 500 metros del lugar indicado.
                    </p>
                </div>

                {/* Info Grid Tiles */}
                <div style={{ display: 'table', width: '100%', borderCollapse: 'separate', borderSpacing: '8px', margin: '0 -8px 24px -8px' }}>
                    <div style={{ display: 'table-row' }}>
                        <div style={{ display: 'table-cell', width: '50%', backgroundColor: '#09090b', padding: '18px 20px', borderRadius: '16px', border: '1px solid #27272a' }}>
                            <p style={{ margin: '0 0 4px 0', color: '#71717a', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>ID de Envío</p>
                            <p style={{ margin: 0, color: '#ffffff', fontSize: '16px', fontWeight: 700, fontFamily: 'monospace' }}>#{shipmentId.substring(0, 8)}</p>
                        </div>
                        <div style={{ display: 'table-cell', width: '50%', backgroundColor: '#09090b', padding: '18px 20px', borderRadius: '16px', border: '1px solid #27272a' }}>
                            <p style={{ margin: '0 0 4px 0', color: '#71717a', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Patente Vehículo</p>
                            <p style={{ margin: 0, color: '#ffffff', fontSize: '16px', fontWeight: 700 }}>{vehiclePlate}</p>
                        </div>
                    </div>
                    <div style={{ display: 'table-row' }}>
                        <div style={{ display: 'table-cell', width: '50%', backgroundColor: '#09090b', padding: '18px 20px', borderRadius: '16px', border: '1px solid #27272a' }}>
                            <p style={{ margin: '0 0 4px 0', color: '#71717a', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Conductor</p>
                            <p style={{ margin: 0, color: '#ffffff', fontSize: '15px', fontWeight: 600 }}>{driverName}</p>
                        </div>
                        <div style={{ display: 'table-cell', width: '50%', backgroundColor: '#09090b', padding: '18px 20px', borderRadius: '16px', border: '1px solid #27272a' }}>
                            <p style={{ margin: '0 0 4px 0', color: '#71717a', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Distancia Estimada</p>
                            <p style={{ margin: 0, color: '#10b981', fontSize: '15px', fontWeight: 800 }}>&lt; 500 metros</p>
                        </div>
                    </div>
                </div>

                {/* Destination Bar */}
                <div style={{ backgroundColor: '#09090b', padding: '20px', borderRadius: '16px', border: '1px solid #27272a', marginBottom: '32px' }}>
                    <p style={{ margin: '0 0 6px 0', color: '#10b981', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>📍 Dirección del Punto</p>
                    <p style={{ margin: 0, color: '#e4e4e7', fontSize: '14px', lineHeight: '1.4', fontWeight: 500 }}>{destinationAddress}</p>
                </div>

                {/* CTA Button */}
                <div style={{ textAlign: 'center' }}>
                    <a href={`https://www.vorianglobal.com/client/shipments/${shipmentId}`} style={{ display: 'inline-block', width: '100%', boxSizing: 'border-box', backgroundColor: '#10b981', color: '#000000', padding: '16px 28px', borderRadius: '14px', fontSize: '15px', fontWeight: 800, textDecoration: 'none', textAlign: 'center', letterSpacing: '0.5px' }}>
                        Ver Seguimiento en Vivo ➔
                    </a>
                </div>
            </div>

            {/* Footer */}
            <div style={{ backgroundColor: '#09090b', padding: '24px 40px', borderTop: '1px solid #27272a', textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#71717a', fontSize: '12px', lineHeight: '1.5' }}>
                    Notificación automática de estado logístico en tiempo real.<br/>
                    <strong style={{ color: '#a1a1aa' }}>© 2026 Vorian Global SpA</strong> — Todos los derechos reservados.
                </p>
            </div>
        </div>
    </div>
  );
}
