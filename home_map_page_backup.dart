import 'dart:async';
import 'dart:convert';
import 'dart:ui' as ui;
import 'package:vorian_freight/pages/chat_support_page.dart';
import 'dart:ui';
import 'dart:io';
import 'dart:typed_data';
import 'dart:math' as math;
import 'package:image_picker/image_picker.dart' as ip;
import 'package:signature/signature.dart' hide Point;
import 'package:path_provider/path_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' as ll;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_compass/flutter_compass.dart';
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart' as mb;
import 'package:geolocator/geolocator.dart' as geo;
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import 'dart:math' show cos, sqrt, asin, sin, pi, pow;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:google_fonts/google_fonts.dart';
// import 'package:vorian_freight/screens/face_verification_screen.dart';
import 'widgets/navigation_overlay.dart';
import 'widgets/waze_search_bar.dart';
import 'widgets/waze_navigation_overlay.dart';
import 'widgets/slide_to_confirm.dart';
import 'widgets/pin_verification_dialog.dart';
import 'driver_profile_page.dart';
import 'features/shipping/shipment_service.dart';
import 'utils/colors.dart';
import 'core/utils/price_engine.dart';
import 'widgets/animated_snake_layer.dart';

// ─────────────────────────────────────────────────────────────────────────────

class HomeChoferPage extends StatefulWidget {
  const HomeChoferPage({super.key});

  @override
  State<HomeChoferPage> createState() => _HomeChoferPageState();
}

class _HomeChoferPageState extends State<HomeChoferPage> {
  final MapController _mapController = MapController();
  List<Polyline> _polylines = [];
  List<ll.LatLng> _snakePoints = [];
  List<Marker> _markers = [];
  List<CircleMarker> _circles = [];
  final String mapboxToken =
      'pk.eyJ1Ijoidm9yaWFuZ2xvYmFsIiwiYSI6ImNtbGpzZnkxeTAzN3kzaG9lZzZodTBvdDcifQ.nx2V98U4hprFaH6XO0avjQ';

  mb.MapboxMap? _mapboxMap;
  mb.PolylineAnnotationManager? _polylineAnnotationManager;
  mb.PointAnnotationManager? _pointAnnotationManager;
  mb.CircleAnnotationManager? _circleAnnotationManager;
  mb.PointAnnotation? _driverAnnotation;
  Uint8List? _gpsMarkerBytes;
  Uint8List? _boxMarkerBytes;

  StreamSubscription? _shipmentsSub;
  StreamSubscription? _ofertasSub;
  StreamSubscription<geo.Position>? _positionStream;
  StreamSubscription<CompassEvent>? _compassSub; // Subscription para la brújula
  Timer? _pingTimer;
  double? _lastSentHeading; // Para filtrar cambios menores de 5 grados
  Timer? _snakeTimer; // Timer para el efecto de flujo constante
  bool _isAnimatingFrame = false; // Flag para evitar solapamiento de frames

  Map<String, dynamic>? _pedidoAsignado;
  double _velocidadReal = 0.0;
  geo.Position? _driverLocation;
  double _compassHeading = 0.0; // Heading actualizado por la brújula del dispositivo
  double _compassOffset = 0.0; // Offset de calibración del icono (0° confirmado)
  mb.Position? _animatedDriverPosition;
  Timer? _markerAnimationTimer;
  bool _isCreatingDriverAnnotation = false;
  int _ofertaSegundosRestantes = 30;
  Timer? _ofertaTimer;
  bool _modoNavegacionActivo = false;
  bool _rutaTrazada = false;
  bool _isNavigationLaunching = false;
  bool _isAvailable = false;
  // --- 📸 POD / PRUEBAS DE ENTREGA ---
  ip.XFile? _fotoRecogida;
  ip.XFile? _fotoEntrega;
  SignatureController? _firmaController;
  bool _podRecogidaCompleto = false;
  bool _podEntregaCompleto = false;
  bool _isFetchingRoute = false; // Estado de carga para la ruta
  // Length of the spark segment in the route animation
  int _sparkLength = 60; // increased tail length for animation
  bool? _lastIsDark;
  bool _isCardExpanded = true;
  String? _driverName;
  bool _isIndependent = true;
  StreamSubscription<List<Map<String, dynamic>>>? _ofertasSubscription;

  Map<String, dynamic>? _ofertaDisponible;
  final List<String> _ofertasRechazadas = [];
  bool _procesandoAceptacion = false;
  bool _isUploadingPOD = false; // Estado de subida de pruebas
  List<dynamic> _sugerenciasSearch = []; // Lista para autocompletado

  // Variables para el historial de telemetría
  DateTime? _ultimoPuntoHistorial;
  geo.Position? _ultimaPosicionHistorial;
  final Color vorianBlack = const Color(0xFF000000);
  final String _customStyle =
      "mapbox://styles/mapbox/light-v11";
  final String _darkStyle =
      "mapbox://styles/mapbox/dark-v11";

  // ── Notificación de Nuevo Viaje ──────────────────────────────────────
  bool _showNewTripOverlay = false;
  Map<String, dynamic>? _newTripData;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Usamos Theme.of(context).brightness para detectar si la APP está en modo dark
    final bool isDarkNow = Theme.of(context).brightness == Brightness.dark ||
        MediaQuery.of(context).platformBrightness == Brightness.dark;

    if (_mapboxMap != null && _lastIsDark != isDarkNow) {
      final String newStyle = isDarkNow ? _darkStyle : _customStyle;
      try {
        _mapboxMap?.loadStyleURI(newStyle);
        debugPrint("Cambiando estilo de mapa a: $newStyle");
        Future.delayed(const Duration(milliseconds: 500), () {
          _trazarRutaEnMapbox();
        });
      } catch (e) {
        debugPrint("Error al cargar estilo de mapa: $e");
      }
    }
    _lastIsDark = isDarkNow;
  }

  @override
  void initState() {
    super.initState();
    _iniciarEscuchaPedidos();
    // Ofertas se inician después de verificar si es independiente
    _cargarNombreConductor();
    _iniciarSeguimientoGps(); // Iniciar GPS siempre para el buscador
    _firmaController = SignatureController(
      penStrokeWidth: 5,
      penColor: Colors.black,
      exportBackgroundColor: Colors.white,
    );
    _iniciarBrujula();
  }

  void _iniciarBrujula() {
    _compassSub = FlutterCompass.events?.listen((CompassEvent event) {
      if (event.heading == null || !mounted) return;
      final double newHeading = event.heading!;
      // Solo actualizamos si el cambio es mayor a 5° para filtrar ruido del magnetómetro
      final double diff = (newHeading - _compassHeading).abs();
      final double wrappedDiff = diff > 180.0 ? 360.0 - diff : diff;
      if (wrappedDiff < 5.0) return;
      setState(() {
        _compassHeading = newHeading;
      });
      _updateDriverMarkerInMapbox();
    });
  }

  Future<void> _cargarNombreConductor() async {
    final uid = Supabase.instance.client.auth.currentUser?.id;
    if (uid == null) return;
    try {
      // 1. Obtener datos técnicos del conductor (disponibilidad y tipo)
      final resDriver = await Supabase.instance.client
          .from('driverProfiles')
          .select('isAvailable, companyId')
          .eq('id', uid)
          .maybeSingle();

      // 2. Obtener el nombre real a través del RPC que creamos
      final resName = await Supabase.instance.client
          .rpc('get_user_profiles_by_ids', params: {
        'user_ids': [uid]
      });

      if (mounted) {
        setState(() {
          if (resName != null && resName is List && resName.isNotEmpty) {
            _driverName = resName[0]['full_name'] as String?;
          }
          if (resDriver != null) {
            _isAvailable = resDriver['isAvailable'] == true;
            _isIndependent = resDriver['companyId'] == null;
            if (_isIndependent && _isAvailable) {
              _iniciarEscuchaOfertas();
            }
          }
        });
        if (_isAvailable) {
          _iniciarSeguimientoGps();
        }
      }
    } catch (e) {
      debugPrint("Error cargando perfil: $e");
    }
  }

  // --- Mapbox Navigation ---
  bool _isNavigating = false;
  String _nextInstruction = "Gira a la derecha en Av. Providencia";
  String _distanceToNext = "200 m";
  String _remainingTime = "12 min";
  String _remainingDistance = "4.2 km";
  String _eta = "--:--";

  @override
  void dispose() {
    _shipmentsSub?.cancel();
    _ofertasSub?.cancel();
    _positionStream?.cancel();
    _compassSub?.cancel();
    _markerAnimationTimer?.cancel();
    _ofertaTimer?.cancel();
    _snakeTimer?.cancel();
    _pingTimer?.cancel();
    super.dispose();
  }

  void _iniciarEscuchaPedidos() {
    final String? uid = Supabase.instance.client.auth.currentUser?.id;
    if (uid == null) return;

    _shipmentsSub = Supabase.instance.client
        .from('shipments')
        .stream(primaryKey: ['id'])
        .eq('driverId', uid)  // ← campo correcto según la BD
        .listen((data) {
          if (!mounted) return;
          if (data.isNotEmpty) {
            // Filtrar envíos no terminados
            final activos = data
                .where((s) {
                  final st = s['status']?.toString().toUpperCase() ?? '';
                  return st != 'COMPLETED' &&
                      st != 'DELIVERED' &&
                      st != 'CANCELLED';
                })
                .toList();

            if (activos.isNotEmpty) {
              // ── Prioridad de estado ──────────────────────────────────
              // 1) IN_TRANSIT / ARRIVED_AT_PICKUP / EN_ROUTE_TO_PICKUP → se ejecuta ahora
              // 2) ACCEPTED → siguiente en cola
              // Dentro del mismo estado: orden FIFO (createdAt ascendente)
              int _statusPriority(String st) {
                switch (st.toUpperCase()) {
                  case 'IN_TRANSIT':          return 0;
                  case 'ARRIVED_AT_DROPOFF':  return 1;
                  case 'ARRIVED_AT_PICKUP':   return 2;
                  case 'EN_ROUTE_TO_PICKUP':  return 3;
                  case 'ACCEPTED':            return 4;
                  default:                    return 5;
                }
              }

              activos.sort((a, b) {
                final pA = _statusPriority(a['status']?.toString() ?? '');
                final pB = _statusPriority(b['status']?.toString() ?? '');
                if (pA != pB) return pA.compareTo(pB); // por prioridad de estado
                // Mismo estado: FIFO por createdAt
                DateTime tA = DateTime.tryParse(a['createdAt']?.toString() ?? '') ?? DateTime.now();
                DateTime tB = DateTime.tryParse(b['createdAt']?.toString() ?? '') ?? DateTime.now();
                return tA.compareTo(tB);
              });

              var activePedido = activos.first;
              activePedido['docId'] = activePedido['id'];
              String? previousId = _pedidoAsignado?['id'];
              String? previousStatus = _pedidoAsignado?['status'];
              final bool isNewTrip = previousId != activePedido['id'];
              setState(() {
                _pedidoAsignado = activePedido;
                // Auto-expand card when a new order arrives or status changes
                if (isNewTrip || previousStatus != activePedido['status']) {
                  _isCardExpanded = true;
                }
                // Mostrar overlay de notificación solo si es un viaje NUEVO
                if (isNewTrip) {
                  _newTripData = activePedido;
                  _showNewTripOverlay = true;
                }
              });

              if (isNewTrip || previousStatus != activePedido['status']) {
                final st = activePedido['status']?.toString().toUpperCase() ?? '';
                // isPreview: mostrar ruta de origen→destino sin navegar
                // !isPreview: ruta dinámica desde ubicación actual
                bool isPreview = (st == 'ACCEPTED');
                _trazarRutaClick(activePedido, isPreview: isPreview);
              }
            } else {
              setState(() {
                _pedidoAsignado = null;
                _snakePoints = [];
                _polylines.clear();
              });
            }
          } else {
            setState(() {
              _pedidoAsignado = null;
              _snakePoints = [];
              _polylines.clear();
            });
          }
        });
  }

  void _iniciarEscuchaOfertas() {
    _ofertasSub = Supabase.instance.client
        .from('shipments')
        .stream(primaryKey: ['id'])
        .eq('status', 'PENDING')
        .listen((data) {
          if (!mounted) return;
          // Buscar el primer viaje disponible que aún no hemos rechazado y que no tenga chofer asignado
          final disponibles = data.where((s) {
            // La tabla usa carrierId
            bool isUnassigned = s['carrierId'] == null;
            bool isNotRejected = !_ofertasRechazadas.contains(s['id']);
            return isUnassigned && isNotRejected;
          }).toList();

          if (disponibles.isNotEmpty) {
            var oferta = disponibles.first;
            oferta['docId'] = oferta['id'];

            // Si es una oferta nueva, dibujamos la pre-ruta
            if (_ofertaDisponible?['id'] != oferta['id']) {
              setState(() => _ofertaDisponible = oferta);
              _iniciarCronometroOferta(oferta['id']);
              _trazarRutaClick(oferta, isPreview: true);
            }
          } else {
            setState(() {
              _ofertaDisponible = null;
              _ofertaTimer?.cancel();
              // Evitar borrar si estamos en medio de aceptar una transacción
              if (_pedidoAsignado == null &&
                  _rutaTrazada &&
                  !_procesandoAceptacion) {
                _finalizarNavegacionManual();
              }
            });
          }
        });
  }

  void _iniciarCronometroOferta(String offerId) {
    _ofertaTimer?.cancel();
    setState(() {
      _ofertaSegundosRestantes = 30;
    });
    _ofertaTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_ofertaDisponible == null || _ofertaDisponible!['id'] != offerId) {
        timer.cancel();
        return;
      }
      if (_ofertaSegundosRestantes <= 1) {
        timer.cancel();
        _rechazarOferta(offerId);
      } else {
        setState(() {
          _ofertaSegundosRestantes--;
        });
      }
    });
  }

  Future<void> _rechazarOferta(String shipmentId) async {
    _ofertaTimer?.cancel();
    setState(() {
      _ofertasRechazadas.add(shipmentId);
      _ofertaDisponible = null;
    });
  }

  Future<void> _aceptarOferta(String shipmentId) async {
    _ofertaTimer?.cancel();
    final uid = Supabase.instance.client.auth.currentUser?.id;
    if (uid == null) return;

    setState(() => _procesandoAceptacion = true);

    try {
      // Reclamamos el envío, nos aseguramos que carrierId esté vacío para evitar race conditions
      final res = await Supabase.instance.client
          .from('shipments')
          .update({
            'status': 'ACCEPTED',
            'carrierId': uid,
            'updatedAt': DateTime.now().toIso8601String(),
          })
          .eq('id', shipmentId)
          .isFilter('carrierId', null)
          .select();

      if (res.isNotEmpty) {
        // Obtenemos el registro actualizado inmediatamente y lo asignamos para que renderice
        var activePedido = res.first;
        activePedido['docId'] = activePedido['id'];

        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text("¡Envío asignado exitosamente!"),
          backgroundColor: Colors.green,
        ));
        setState(() {
          _ofertaDisponible = null;
          _pedidoAsignado = activePedido;
          _modoNavegacionActivo = true;
        });

        // Aseguramos que se trance de manera definitiva de nuevo
        await _trazarRutaClick(activePedido, isPreview: false);

        // Si ya está trazada, hacemos el acercamiento 3D
        _centrarNavegacion3D();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text("Alguien más ya ha aceptado este envío."),
          backgroundColor: Colors.orange,
        ));
        setState(() {
          _ofertasRechazadas.add(shipmentId);
          _ofertaDisponible = null;
        });
      }
    } catch (e) {
      debugPrint("Error aceptando envío: $e");
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text("Error de red al intentar reclamar el envío."),
      ));
    } finally {
      if (mounted) setState(() => _procesandoAceptacion = false);
    }
  }

  Future<String?> _uploadPOD(String prefix, Uint8List bytes) async {
    try {
      final fileName = '${prefix}_${DateTime.now().millisecondsSinceEpoch}.png';
      final path = 'pod/$fileName';
      
      await Supabase.instance.client.storage
          .from('pod_proofs')
          .uploadBinary(path, bytes, fileOptions: const FileOptions(contentType: 'image/png'));
          
      return Supabase.instance.client.storage
          .from('pod_proofs')
          .getPublicUrl(path);
    } catch (e) {
      debugPrint("Error subiendo POD: $e");
      return null;
    }
  }

  Future<void> _actualizarEstado(String nuevoEstado) async {
    if (_pedidoAsignado == null) return;

    if (mounted) setState(() => _isUploadingPOD = true);

    final shipmentId = _pedidoAsignado!['docId'] ?? _pedidoAsignado!['id'];
    final isFinished = nuevoEstado == 'COMPLETED' || nuevoEstado == 'DELIVERED';
    final isPickedUp = nuevoEstado == 'IN_TRANSIT';

    // Construir el payload del update
    final updateData = <String, dynamic>{
      'status': nuevoEstado,
      'updatedAt': DateTime.now().toIso8601String(),
    };

    try {
      // 1. Subir Pruebas de Recogida si aplica
      if (isPickedUp && _fotoRecogida != null) {
        final bytes = await _fotoRecogida!.readAsBytes();
        final url = await _uploadPOD('pickup_$shipmentId', bytes);
        if (url != null) updateData['pickup_photo'] = url;
      }
      
      // 2. Subir Pruebas de Entrega si aplica
      if (isFinished) {
        if (_fotoEntrega != null) {
          final bytes = await _fotoEntrega!.readAsBytes();
          final url = await _uploadPOD('delivery_$shipmentId', bytes);
          if (url != null) updateData['delivery_photo'] = url;
        }
        if (_firmaController != null && _firmaController!.isNotEmpty) {
          final signatureBytes = await _firmaController!.toPngBytes();
          if (signatureBytes != null) {
             final url = await _uploadPOD('signature_$shipmentId', signatureBytes);
             if (url != null) updateData['delivery_signature'] = url;
          }
        }
      }

      await Supabase.instance.client
          .from('shipments')
          .update(updateData)
          .eq('id', shipmentId);

      if (!mounted) return;

      if (isFinished) {
        // Limpiar el estado local INMEDIATAMENTE para que la UI responda
        // sin esperar al stream (evita la carrera de condición)
        _mostrarMensajeMotivador(esFinDeTurno: false);
        _finalizarNavegacionManual();
        setState(() => _isAvailable = true);
      } else {
        // Fase intermedia: actualizar localmente Y re-trazar ruta
        var pedidoCopia = Map<String, dynamic>.from(_pedidoAsignado!);
        pedidoCopia['status'] = nuevoEstado;
        if (mounted) {
          setState(() => _pedidoAsignado = pedidoCopia);
          _trazarRutaClick(pedidoCopia, isPreview: false);
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Error al actualizar estado: $e'),
          backgroundColor: VorianColors.red,
        ));
      }
    } finally {
      if (mounted) setState(() => _isUploadingPOD = false);
    }
  }

  void _finalizarNavegacionManual() {
    setState(() {
      _modoNavegacionActivo = false;
      _rutaTrazada = false;
      _pedidoAsignado = null;
      _podRecogidaCompleto = false;
      _podEntregaCompleto = false;
      _fotoRecogida = null;
      _fotoEntrega = null;
      _firmaController?.clear();
    });
    if (mounted) setState(() {
      _polylines.clear();
      _snakePoints = [];
    });
    if (mounted) setState(() => _markers.clear());
    if (mounted) setState(() => _circles.clear());
    
    // Clear Mapbox
    _polylineAnnotationManager?.deleteAll();
    _pointAnnotationManager?.deleteAll();
    _circleAnnotationManager?.deleteAll();
    _driverAnnotation = null;

    _snakeTimer?.cancel();
  }

  // --- 🛰️ NAVEGACIÓN REFINADA ---
  Future<void> _centrarNavegacion3D() async {
    if (_driverLocation == null || _mapboxMap == null) return;
    try {
      await _mapboxMap!.setCamera(mb.CameraOptions(
        center: mb.Point(coordinates: mb.Position(_driverLocation!.longitude, _driverLocation!.latitude)),
        zoom: 17.0,
      ));
    } catch (_) {}
  }

  List<double>? _parseLocationString(String? val) {
    if (val == null || val.isEmpty) return null;
    
    // Parse POINT(-70.64 33.45)
    final pointMatch = RegExp(r'POINT\(([-.\d]+)\s+([-.\d]+)\)', caseSensitive: false).firstMatch(val);
    if (pointMatch != null) {
      final lng = double.tryParse(pointMatch.group(1) ?? '');
      final lat = double.tryParse(pointMatch.group(2) ?? '');
      if (lng != null && lat != null) return [lng, lat];
    }
    
    // Parse WKB Hex (e.g. 0101000020E610...)
    if (val.length >= 42 && val.toLowerCase().startsWith('01')) {
      try {
        final typeBytes = List.generate(4, (i) => int.parse(val.substring(2 + i * 2, 4 + i * 2), radix: 16));
        final typeVal = typeBytes[0] | (typeBytes[1] << 8) | (typeBytes[2] << 16) | (typeBytes[3] << 24);
        final hasSRID = (typeVal & 0x20000000) != 0;
        final startHex = hasSRID ? 18 : 10;
        
        double hexToDouble(String h) {
          final bytes = List.generate(8, (i) => int.parse(h.substring(i * 2, i * 2 + 2), radix: 16));
          final byteData = ByteData(8);
          for (int i = 0; i < 8; i++) byteData.setUint8(i, bytes[i]);
          return byteData.getFloat64(0, Endian.little);
        }
        
        final lng = hexToDouble(val.substring(startHex, startHex + 16));
        final lat = hexToDouble(val.substring(startHex + 16, startHex + 32));
        return [lng, lat];
      } catch (_) {}
    }
    
    return null;
  }

  Future<void> _trazarRutaClick(Map<String, dynamic> pedido,
      {bool isPreview = false}) async {
    try {
      // Función auxiliar para obtener coordenadas con fallbacks y seguridad de nulos
      double? getCoord(List<String> keys) {
        for (var key in keys) {
          if (pedido[key] != null) {
            final val = pedido[key];
            if (val is num) return val.toDouble();
            if (val is String) return double.tryParse(val);
          }
        }
        return null;
      }

      double? latA =
          getCoord(['pickup_latitude', 'pickup_lat', 'originLatitude']);
      double? lngA =
          getCoord(['pickup_longitude', 'pickup_lng', 'originLongitude']);
      double? latB = getCoord(
          ['delivery_latitude', 'delivery_lat', 'destinationLatitude']);
      double? lngB = getCoord(
          ['delivery_longitude', 'delivery_lng', 'destinationLongitude']);

      if (latA == null || lngA == null) {
        final originCoords = _parseLocationString(pedido['origin']?.toString() ?? pedido['pickup_location']?.toString());
        if (originCoords != null) {
          lngA = originCoords[0];
          latA = originCoords[1];
        }
      }
      
      if (latB == null || lngB == null) {
        final destCoords = _parseLocationString(pedido['destination']?.toString() ?? pedido['delivery_location']?.toString());
        if (destCoords != null) {
          lngB = destCoords[0];
          latB = destCoords[1];
        }
      }

      // Si no están planas, buscar dentro del JSON 'details'
      if ((latA == null || latB == null) && pedido['details'] != null) {
        try {
          var details = pedido['details'];
          if (details is String) details = jsonDecode(details);

          if (details is Map &&
              details['route'] is Map &&
              details['route']['coordinates'] is List) {
            List coords = details['route']['coordinates'];
            if (coords.isNotEmpty) {
              var origin = coords.first;
              var destino = coords.last;

              if (origin != null && origin.length >= 2) {
                lngA ??= double.tryParse(origin[0].toString());
                latA ??= double.tryParse(origin[1].toString());
              }
              if (destino != null && destino.length >= 2) {
                lngB ??= double.tryParse(destino[0].toString());
                latB ??= double.tryParse(destino[1].toString());
              }
            }
          }
        } catch (e) {
          debugPrint("Error parsing details coords: $e");
        }
      }

      if (latA == null || lngA == null || latB == null || lngB == null) {
        if (!isPreview) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content: Text(
                    "Error: Coordenadas de origen o destino no encontradas en el envío.")),
          );
        }
        return;
      }

      // --- Waze-like Dynamic Routing ---
      double rLatA = latA;
      double rLngA = lngA;
      double rLatB = latB;
      double rLngB = lngB;

      String status = pedido['status']?.toString().toUpperCase() ?? '';
      bool isArrivedAtPickup = (status == 'ARRIVED_AT_PICKUP');

      if (!isPreview && _driverLocation != null) {
        if (status == 'ACCEPTED' || status == 'EN_ROUTE_TO_PICKUP') {
          // Fase 1: Teléfono (Casa) -> Pickup
          rLatB = latA;
          rLngB = lngA;
          rLatA = _driverLocation!.latitude;
          rLngA = _driverLocation!.longitude;
        } else if (status == 'IN_TRANSIT') {
          // Fase 2: Teléfono (Pickup) -> Delivery final
          rLatA = _driverLocation!.latitude;
          rLngA = _driverLocation!.longitude;
        }
      }

      setState(() {
        _rutaTrazada = true;
        _isFetchingRoute = true;
      });

      await Future.delayed(const Duration(milliseconds: 1000));
      // Map check removed

      if (mounted) setState(() => _markers.clear());
      if (mounted) setState(() {
        _polylines.clear();
        _snakePoints = [];
      });
      if (mounted) setState(() => _circles.clear());
      
      // Clear Mapbox
      _polylineAnnotationManager?.deleteAll();
      _pointAnnotationManager?.deleteAll();
      _circleAnnotationManager?.deleteAll();
      _driverAnnotation = null;
      
      _snakeTimer?.cancel();

      // Marcadores siempre visibles como balizas
      _agregarMarcadorCuadrado(
          lngA!, latA!, VorianColors.primaryLight, true); // Pickup
      _agregarMarcadorCuadrado(
          lngB!, latB!, VorianColors.primary, false); // Dropoff

      if (isArrivedAtPickup) {
        // Mostrar animación de caja en el origen y no trazar ruta
        _boxMarkerBytes ??= await _generateBoxMarkerPng();
        _pointAnnotationManager?.create(mb.PointAnnotationOptions(
          geometry: mb.Point(coordinates: mb.Position(lngA!, latA!)),
          image: _boxMarkerBytes,
          iconSize: 0.8,
        ));
      }

      bool isTransit = false;
      if (!isPreview) {
        String status = pedido['status'] ?? '';
        isTransit = (status == 'IN_TRANSIT');
      }

      // Línea trazada conectando dinámicamente según la fase de viaje
      if (!isArrivedAtPickup) {
        await _trazarRutaRoja(rLatA, rLngA, rLatB, rLngB, isAnimated: isTransit);
      }

      // Enfoque de cámara (solo si estamos en previsualización, sino el 3D domina)
      if (isPreview && _mapboxMap != null) {
        var camera = await _mapboxMap!.cameraForCoordinates([
          mb.Point(coordinates: mb.Position(lngA!, latA!)),
          mb.Point(coordinates: mb.Position(lngB!, latB!)),
        ], mb.MbxEdgeInsets(top: 50, left: 50, bottom: 50, right: 50), null, null);
        await _mapboxMap!.flyTo(camera, mb.MapAnimationOptions(duration: 1500));
      } else if (_driverLocation != null && _mapboxMap != null) {
        await _mapboxMap!.setCamera(mb.CameraOptions(
          center: mb.Point(coordinates: mb.Position(_driverLocation!.longitude, _driverLocation!.latitude)),
          zoom: 14.0,
        ));
        _updateDriverMarkerInMapbox();
      }
    } catch (e) {
      debugPrint("Error al iniciar navegación: $e");
    } finally {
      if (mounted) {
        setState(() => _isFetchingRoute = false);
      }
    }
  }

  Future<void> _iniciarRecorridoClick() async {
    if (_pedidoAsignado == null || _isNavigationLaunching) return;

    _isNavigationLaunching = true;

    double? getCoord(List<String> keys) {
      for (var k in keys) {
        if (_pedidoAsignado![k] != null) {
          final val = _pedidoAsignado![k];
          if (val is double) return val;
          if (val is int) return val.toDouble();
          if (val is String) return double.tryParse(val);
        }
      }
      return null;
    }

    // Determinar a dónde ir y el nuevo estado según el estado actual
    String currentStatus = _pedidoAsignado!['status'] ?? '';
    bool goingToPickup = currentStatus == 'ACCEPTED' || currentStatus == 'EN_ROUTE_TO_PICKUP';
    
    // Obtener coordenadas de destino
    double? dLat;
    double? dLng;
    
    if (goingToPickup) {
      dLat = getCoord(['pickup_latitude', 'pickup_lat', 'originLatitude']);
      dLng = getCoord(['pickup_longitude', 'pickup_lng', 'originLongitude']);
      if (dLat == null || dLng == null) {
        final coords = _parseLocationString(_pedidoAsignado!['origin']?.toString() ?? _pedidoAsignado!['pickup_location']?.toString());
        if (coords != null) { dLng = coords[0]; dLat = coords[1]; }
      }
    } else {
      dLat = getCoord(['delivery_latitude', 'delivery_lat', 'destinationLatitude']);
      dLng = getCoord(['delivery_longitude', 'delivery_lng', 'destinationLongitude']);
      if (dLat == null || dLng == null) {
        final coords = _parseLocationString(_pedidoAsignado!['destination']?.toString() ?? _pedidoAsignado!['delivery_location']?.toString());
        if (coords != null) { dLng = coords[0]; dLat = coords[1]; }
      }
    }

    // Si no están en la raíz, buscarlas dentro de 'details'
    if ((dLat == null || dLng == null) && _pedidoAsignado!['details'] != null) {
      try {
        var details = _pedidoAsignado!['details'];
        if (details is String) details = jsonDecode(details);

        if (details is Map &&
            details['route'] is Map &&
            details['route']['coordinates'] is List) {
          List coords = details['route']['coordinates'];
          if (coords.isNotEmpty) {
            var targetCoord = goingToPickup ? coords.first : coords.last;
            if (targetCoord is List && targetCoord.length >= 2) {
              dLng ??= (targetCoord[0] as num).toDouble();
              dLat ??= (targetCoord[1] as num).toDouble();
            } else if (targetCoord is Map) {
              dLat ??= (targetCoord['lat'] as num?)?.toDouble();
              dLng ??= (targetCoord['lng'] as num?)?.toDouble();
            }
          }
        }
      } catch (e) {
        debugPrint("Error parsing details destination: $e");
      }
    }

    if (dLat == null || dLng == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text(
                  "Error: No se encontró el destino en la base de datos.")),
        );
        _isNavigationLaunching = false;
      }
      return;
    }

    // Verificar que tenemos la ubicación del conductor
    if (_driverLocation == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Esperando señal GPS...")),
        );
        _isNavigationLaunching = false;
      }
      return;
    }

    // Actualizar estado en Supabase antes de iniciar
    String nextStatus = goingToPickup ? 'EN_ROUTE_TO_PICKUP' : 'IN_TRANSIT';
    try {
      if (currentStatus != nextStatus) {
        await Supabase.instance.client
            .from('shipments')
            .update({'status': nextStatus}).eq('id', _pedidoAsignado!['id']);
      }
    } catch (e) {
      debugPrint("Error actualizando estado: $e");
    }

    // Mostrar diálogo de selección de app de navegación
    _isNavigationLaunching = false;
    if (mounted) {
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text("¿Cómo deseas navegar?"),
          content: const Text("Elige tu app de navegación preferida."),
          actionsAlignment: MainAxisAlignment.center,
          actionsOverflowAlignment: OverflowBarAlignment.center,
          actions: [
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: VorianColors.purple,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(Icons.navigation),
                label: const Text("Navegación en App"),
                onPressed: () {
                  Navigator.pop(context);
                  if (mounted) {
                    _trazarRutaRoja(
                      _driverLocation?.latitude ?? -33.4489,
                      _driverLocation?.longitude ?? -70.6693,
                      dLat!, dLng!,
                    );
                    setState(() {
                      _isNavigating = true;
                      _nextInstruction = "Iniciando navegación...";
                      _eta = _calcularEtaSimulado();
                    });
                    _centrarNavegacion3D();
                  }
                },
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(Icons.navigation, color: Colors.blue),
                label: const Text("Waze"),
                onPressed: () {
                  Navigator.pop(context);
                  _abrirWaze(dLat!, dLng!);
                },
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(Icons.map, color: Colors.green),
                label: const Text("Google Maps"),
                onPressed: () {
                  Navigator.pop(context);
                  _abrirGoogleMaps(dLat!, dLng!);
                },
              ),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Cancelar", style: TextStyle(color: Colors.grey)),
            ),
          ],
        ),
      );
    }
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) {
          _isNavigationLaunching = false;
        }
      });
  }

  String _calcularEtaSimulado() {
    final now = DateTime.now().add(const Duration(minutes: 12));
    return "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}";
  }

  Widget _mapOptionTile(String title, IconData icon, VoidCallback onTap,
      {bool isPrimary = false}) {
    final bool isDark =
        MediaQuery.of(context).platformBrightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: ListTile(
        onTap: onTap,
        leading: Icon(icon,
            color: isPrimary
                ? (isDark ? Colors.white : vorianBlack)
                : Colors.grey),
        title: Text(title,
            style: TextStyle(
                fontWeight: isPrimary ? FontWeight.bold : FontWeight.normal,
                color: isDark ? Colors.white : Colors.black)),
        trailing: Icon(Icons.arrow_forward_ios,
            size: 14, color: isDark ? Colors.white54 : Colors.grey),
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(15),
            side: BorderSide(
                color: isDark ? Colors.white10 : Colors.grey.shade200)),
      ),
    );
  }

  Future<void> _abrirWaze(double lat, double lng) async {
    final url = Uri.parse("https://waze.com/ul?ll=$lat,$lng&navigate=yes");
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Waze no está instalado")));
    }
  }

  Future<void> _abrirGoogleMaps(double lat, double lng) async {
    final url = Uri.parse(
        "https://www.google.com/maps/dir/?api=1&destination=$lat,$lng");
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Google Maps no está instalado")));
    }
  }

  void _agregarCirculo(double lng, double lat, Color color) {
    if (mounted)
      setState(() => _circles.add(CircleMarker(
          point: ll.LatLng(lat, lng),
          radius: 10.0,
          color: color,
          borderColor: Colors.white,
          borderStrokeWidth: 3.0)));
  }

  Future<void> _trazarRutaRoja(
      double oLat, double oLng, double dLat, double dLng, {bool isAnimated = false}) async {
    final url =
        'https://api.mapbox.com/directions/v5/mapbox/driving/$oLng,$oLat;$dLng,$dLat?geometries=geojson&overview=full&steps=true&language=es&access_token=$mapboxToken';

    debugPrint("Obteniendo ruta: $url");
    try {
      final response = await http.get(Uri.parse(url));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);

        if (data['routes'] != null && data['routes'].isNotEmpty) {
          final route = data['routes'][0];
          final List coords = route['geometry']['coordinates'];

          // Actualizar info de navegación si estamos navegando
          if (mounted) {
            setState(() {
              final duration = (route['duration'] / 60).round();
              final distance = (route['distance'] / 1000).toStringAsFixed(1);
              _remainingTime = "$duration min";
              _remainingDistance = "$distance km";

              if (route['legs'] != null && route['legs'].isNotEmpty) {
                final steps = route['legs'][0]['steps'];
                if (steps != null && steps.isNotEmpty) {
                  final nextStep = steps[0];
                  _nextInstruction =
                      nextStep['maneuver']['instruction'] ?? "Sigue recto";
                  double distMeters = (nextStep['distance'] as num).toDouble();
                  _distanceToNext = distMeters > 1000
                      ? "${(distMeters / 1000).toStringAsFixed(1)} km"
                      : "${distMeters.round()} m";
                }
              }
            });
          }

          List<ll.LatLng> routePoints = coords
              .map((c) => ll.LatLng(c[1].toDouble(), c[0].toDouble()))
              .toList();

          if (isAnimated) {
            _iniciarAnimacionSnake(routePoints);
          } else {
            _snakeTimer?.cancel();
            if (mounted) {
              setState(() {
                _snakePoints = routePoints;
              });
              _trazarRutaEnMapbox();
            }
          }
        } else {
          debugPrint("Mapbox Error Response: ${response.body}");
          _mostrarErrorRuta("No se encontró ruta");
        }
      } else {
        debugPrint("Mapbox HTTP Error: ${response.statusCode} - ${response.body}");
        _mostrarErrorRuta("Error Mapbox: ${response.statusCode}");
      }
    } catch (e) {
      debugPrint("Mapbox Exception: $e");
      _mostrarErrorRuta("Error al conectar con Mapbox");
    } finally {
      if (mounted) setState(() => _isFetchingRoute = false);
    }
  }

  Future<Uint8List> _generateGpsMarkerPng() async {
    final ui.PictureRecorder pictureRecorder = ui.PictureRecorder();
    final Canvas canvas = Canvas(pictureRecorder);
    const double size = 64.0;
    const double center = size / 2;
    
    final Paint bgPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;
    canvas.drawCircle(const Offset(center, center), 26.0, bgPaint);
    
    final Paint borderPaint = Paint()
      ..color = Colors.black
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6.0;
    canvas.drawCircle(const Offset(center, center), 26.0, borderPaint);
    
    final Paint arrowPaint = Paint()
      ..color = Colors.black
      ..style = PaintingStyle.fill;
    final Path path = Path();
    path.moveTo(center, center - 16.0);
    path.lineTo(center - 12.0, center + 14.0);
    path.lineTo(center, center + 6.0);
    path.lineTo(center + 12.0, center + 14.0);
    path.close();
    canvas.drawPath(path, arrowPaint);
    
    final ui.Image image = await pictureRecorder.endRecording().toImage(size.toInt(), size.toInt());
    final ByteData? byteData = await image.toByteData(format: ui.ImageByteFormat.png);
    return byteData!.buffer.asUint8List();
  }

  Future<Uint8List> _generateBoxMarkerPng() async {
    final ui.PictureRecorder pictureRecorder = ui.PictureRecorder();
    final Canvas canvas = Canvas(pictureRecorder);
    const double size = 64.0;
    const double center = size / 2;
    
    final Paint paint = Paint()
      ..color = VorianColors.pinkStrong
      ..style = PaintingStyle.fill;
    
    final Path path = Path();
    path.moveTo(center, center - 18.0);
    path.lineTo(center - 16.0, center - 8.0);
    path.lineTo(center - 16.0, center + 10.0);
    path.lineTo(center, center + 20.0);
    path.lineTo(center + 16.0, center + 10.0);
    path.lineTo(center + 16.0, center - 8.0);
    path.close();
    canvas.drawPath(path, paint);
    
    final Paint borderPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.0;
    canvas.drawPath(path, borderPaint);
    
    final ui.Image image = await pictureRecorder.endRecording().toImage(size.toInt(), size.toInt());
    final ByteData? byteData = await image.toByteData(format: ui.ImageByteFormat.png);
    return byteData!.buffer.asUint8List();
  }

  Future<void> _updateDriverMarkerInMapbox() async {
    if (_pointAnnotationManager == null || _driverLocation == null) return;
    
    _gpsMarkerBytes ??= await _generateGpsMarkerPng();
    
    // Offset de calibración ajustable desde el botón flotante
    final double heading = (_compassHeading + _compassOffset) % 360.0;
    
    final mb.Position position = _animatedDriverPosition ?? 
        mb.Position(_driverLocation!.longitude, _driverLocation!.latitude);

    final mb.PointAnnotationOptions options = mb.PointAnnotationOptions(
      geometry: mb.Point(coordinates: position),
      image: _gpsMarkerBytes,
      iconRotate: heading,
      iconSize: 1.5,
    );
    
    if (_driverAnnotation == null) {
      if (_isCreatingDriverAnnotation) return;
      _isCreatingDriverAnnotation = true;
      try {
        _driverAnnotation = await _pointAnnotationManager!.create(options);
      } finally {
        _isCreatingDriverAnnotation = false;
      }
    } else {
      _driverAnnotation!.geometry = options.geometry;
      _driverAnnotation!.iconRotate = options.iconRotate;
      await _pointAnnotationManager!.update(_driverAnnotation!);
    }
  }

  void _animateDriverMarker(mb.Position targetPosition) {
    _markerAnimationTimer?.cancel();
    
    if (_animatedDriverPosition == null) {
      _animatedDriverPosition = targetPosition;
      _updateDriverMarkerInMapbox();
      return;
    }

    final double startLng = _animatedDriverPosition!.lng.toDouble();
    final double startLat = _animatedDriverPosition!.lat.toDouble();
    final double targetLng = targetPosition.lng.toDouble();
    final double targetLat = targetPosition.lat.toDouble();

    const int totalSteps = 125; // 125 frames (16ms interval = 2000ms / 2.0s total)
    int currentStep = 0;
    
    _markerAnimationTimer = Timer.periodic(const Duration(milliseconds: 16), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      currentStep++;
      final double fraction = currentStep / totalSteps;
      
      // Aplicar curva de suavizado easeInOut para acelerar y desacelerar de forma natural
      final double curveFraction = Curves.easeInOut.transform(fraction);
      
      final double currentLng = startLng + (targetLng - startLng) * curveFraction;
      final double currentLat = startLat + (targetLat - startLat) * curveFraction;

      _animatedDriverPosition = mb.Position(currentLng, currentLat);
      _updateDriverMarkerInMapbox();

      if (currentStep >= totalSteps) {
        timer.cancel();
      }
    });
  }

  Future<void> _trazarRutaEnMapbox() async {
    if (_polylineAnnotationManager == null) return;
    await _polylineAnnotationManager!.deleteAll();
    
    if (_snakePoints.isEmpty) return;
    
    final bool isDark = Theme.of(context).brightness == Brightness.dark ||
        MediaQuery.of(context).platformBrightness == Brightness.dark;
        
    final List<mb.Position> positions = _snakePoints
        .map((p) => mb.Position(p.longitude, p.latitude))
        .toList();
        
    await _polylineAnnotationManager!.create(mb.PolylineAnnotationOptions(
      geometry: mb.LineString(coordinates: positions),
      lineColor: (isDark ? Colors.black : Colors.white).value,
      lineWidth: 9.0,
      lineOpacity: 0.9,
    ));
    
    await _polylineAnnotationManager!.create(mb.PolylineAnnotationOptions(
      geometry: mb.LineString(coordinates: positions),
      lineColor: (isDark ? Colors.white : Colors.black).value,
      lineWidth: 5.0,
      lineOpacity: 1.0,
    ));
  }

  void _iniciarAnimacionSnake(List<ll.LatLng> points) async {
    _snakeTimer?.cancel();
    if (mounted) setState(() {
      _polylines.clear();
      _snakePoints = points;
    });
    _trazarRutaEnMapbox();
  }

  Future<void> _agregarMarcadorCuadrado(
      double lng, double lat, Color color, bool hasBorder) async {
    if (_circleAnnotationManager == null) return;
    await _circleAnnotationManager!.create(mb.CircleAnnotationOptions(
      geometry: mb.Point(coordinates: mb.Position(lng, lat)),
      circleRadius: 10.0,
      circleColor: color.value,
      circleStrokeColor: (hasBorder ? VorianColors.purple : color).value,
      circleStrokeWidth: hasBorder ? 3.0 : 0.0,
    ));
  }

  void _mostrarErrorRuta(String mensaje) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(mensaje), backgroundColor: Colors.red),
      );
    }
  }

  void _startPinging(String driverId) {
    _sendPing(driverId);
    _pingTimer = Timer.periodic(const Duration(minutes: 2), (timer) {
      _sendPing(driverId);
    });
  }

  void _stopPinging() {
    _pingTimer?.cancel();
    _pingTimer = null;
  }

  Future<void> _sendPing(String driverId) async {
    try {
      await Supabase.instance.client
          .from('driverProfiles')
          .update({'last_ping': DateTime.now().toUtc().toIso8601String()})
          .eq('id', driverId);
      debugPrint("Heartbeat enviado: Chofer sigue activo.");
    } catch (e) {
      debugPrint('Error enviando heartbeat: $e');
    }
  }

  Future<void> _toggleOnline(bool value) async {
    final String? uid = Supabase.instance.client.auth.currentUser?.id;
    if (uid == null) return;

    setState(() => _isAvailable = value);

    await Supabase.instance.client.from('driverProfiles').upsert({
      'id': uid,
      'isAvailable': value,
      'updatedAt': DateTime.now().toIso8601String(),
      'lastLocationUpdate': DateTime.now().toIso8601String(),
      if (value && _driverLocation != null)
        'currentLatitude': _driverLocation!.latitude,
      if (value && _driverLocation != null)
        'currentLongitude': _driverLocation!.longitude,
    });

    if (value) {
      _iniciarSeguimientoGps();
      _startPinging(uid);
      if (_isIndependent) {
        _iniciarEscuchaOfertas();
      }
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text("Ahora estás en línea")));
    } else {
      _stopPinging();
      _positionStream?.cancel();
      _ofertasSub?.cancel();
      _ofertasSub = null;
      setState(() {
        _driverLocation = null;
        _velocidadReal = 0.0;
        _ofertaDisponible = null;
      });
      _finalizarNavegacionManual();
      _mostrarMensajeMotivador(esFinDeTurno: true);
    }
  }

  Future<void> _iniciarSeguimientoGps() async {
    geo.LocationPermission permission =
        await geo.Geolocator.requestPermission();
    if (permission == geo.LocationPermission.denied) return;

    // Iniciar escucha de GPS solamente (sin brújula)
    // _iniciarEscuchaBrujula(); // Desactivado por simplicidad

    // Send initial position immediately, prefering getLastKnownPosition to prevent UI freezes or indoor timeouts
    try {
      geo.Position? initialPos = await geo.Geolocator.getLastKnownPosition();
      // Si no hay posición reciente, forzamos a pedir la actual (con tiempo límite)
      initialPos ??= await geo.Geolocator.getCurrentPosition(
        desiredAccuracy: geo.LocationAccuracy.best,
        timeLimit: const Duration(seconds: 5),
      );

      _syncPositionToSupabase(initialPos);
      if (mounted) {
        setState(() {
          _driverLocation = initialPos;
          _velocidadReal = initialPos!.speed * 3.6;
        });
        
        // Mover la cámara a la ubicación inicial para que no se quede en (0,0)
        try {
          _mapController.move(ll.LatLng(initialPos!.latitude, initialPos!.longitude), 14.0);
        } catch (_) {}
      }
    } catch (e) {
      debugPrint("Error al obtener posición inicial: $e");
    }

    // Configuración optimizada para "Tiempo Real" (Estilo Uber)
    late geo.LocationSettings locationSettings;

    if (defaultTargetPlatform == TargetPlatform.android) {
      locationSettings = geo.AndroidSettings(
        accuracy: geo.LocationAccuracy.bestForNavigation,
        distanceFilter: 0,
        forceLocationManager: false,
        intervalDuration: const Duration(milliseconds: 1000), // 1 segundo
        foregroundNotificationConfig: const geo.ForegroundNotificationConfig(
          notificationText:
              "Vorian está rastreando tu ubicación en tiempo real",
          notificationTitle: "Rastreo activo",
          enableWakeLock: true,
        ),
      );
    } else if (defaultTargetPlatform == TargetPlatform.iOS ||
        defaultTargetPlatform == TargetPlatform.macOS) {
      locationSettings = geo.AppleSettings(
        accuracy: geo.LocationAccuracy.bestForNavigation,
        activityType: geo.ActivityType.automotiveNavigation,
        distanceFilter: 0,
        pauseLocationUpdatesAutomatically: false,
        showBackgroundLocationIndicator: true,
      );
    } else {
      locationSettings = const geo.LocationSettings(
        accuracy: geo.LocationAccuracy.bestForNavigation,
        distanceFilter: 0, // Actualización en tiempo real
      );
    }

    _positionStream = geo.Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen((pos) {
      if (mounted) {
        // Filtramos lecturas con baja precisión del GPS (>20m de error)
        // Esto elimina los saltos sin sacrificar fluidez al moverse
        if (pos.accuracy > 20.0) return;

        setState(() {
          _driverLocation = pos;
          _velocidadReal = pos.speed * 3.6;
        });

        _syncPositionToSupabase(pos);

        // Animar la flecha a la nueva coordenada
        _animateDriverMarker(mb.Position(pos.longitude, pos.latitude));

        // Animar la cámara de forma fluida
        if (_isNavigating && _mapboxMap != null) {
          _mapboxMap!.easeTo(
            mb.CameraOptions(
              center: mb.Point(coordinates: mb.Position(pos.longitude, pos.latitude)),
              zoom: 17.0,
            ),
            mb.MapAnimationOptions(duration: 2000),
          );
        }
      }
    });
  }

  // Brújula desactivada para simplificar el rastreo.
  void _syncPositionToSupabase(geo.Position pos) {
    if (!_isAvailable) return;

    final uid = Supabase.instance.client.auth.currentUser?.id;
    if (uid == null) return;

    // 1. Sincronización en TIEMPO REAL (Punto actual para Mission Control)
    Supabase.instance.client.from('driverProfiles').upsert({
      'id': uid,
      'currentLatitude': pos.latitude,
      'currentLongitude': pos.longitude,
      'speed': pos.speed * 3.6, // km/h
      'heading': pos.heading, // grados (dirección)
      'lastLocationUpdate': DateTime.now().toIso8601String(),
    }).catchError((err) => debugPrint("Error syncing driverProfiles: $err"));

    // 2. Grabación de HISTORIAL (Caja Negra) - Solo si hay un envío activo
    if (_pedidoAsignado != null) {
      final String? shipmentId = _pedidoAsignado!['id'];
      final String? status = _pedidoAsignado!['status'];

      // Solo grabar en estados activos del viaje
      final listadoEstadosActivos = [
        'ACCEPTED',
        'EN_ROUTE_TO_PICKUP',
        'ARRIVED_AT_PICKUP',
        'IN_TRANSIT',
        'ARRIVED_AT_DROPOFF',
      ];

      if (shipmentId != null && listadoEstadosActivos.contains(status)) {
        final ahora = DateTime.now();

        // Throttling: Grabar solo cada 30 segundos O si se movió más de 30 metros
        bool debeGrabar = false;
        if (_ultimoPuntoHistorial == null) {
          debeGrabar = true;
        } else {
          final segundosTranscurridos =
              ahora.difference(_ultimoPuntoHistorial!).inSeconds;
          double distancia = 31; // Default mayor al umbral

          if (_ultimaPosicionHistorial != null) {
            distancia = geo.Geolocator.distanceBetween(
                _ultimaPosicionHistorial!.latitude,
                _ultimaPosicionHistorial!.longitude,
                pos.latitude,
                pos.longitude);
          }

          if (segundosTranscurridos >= 30 || distancia >= 30) {
            debeGrabar = true;
          }
        }

        if (debeGrabar) {
          _ultimoPuntoHistorial = ahora;
          _ultimaPosicionHistorial = pos;

          /* TODO: Habilitar una vez creada la tabla 'location_history' en Supabase
          Supabase.instance.client.from('location_history').insert({
            'driver_id': uid,
            'shipment_id': shipmentId,
            'latitude': pos.latitude,
            'longitude': pos.longitude,
            'speed': pos.speed * 3.6,
            'heading': pos.heading,
            'timestamp': ahora.toIso8601String(),
          }).then((_) {
            debugPrint("Telemetry point saved for shipment: $shipmentId");
          }).catchError((err) {
            debugPrint("Error saving telemetry: $err");
          });
          */
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isDark =
        MediaQuery.of(context).platformBrightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0A0A0A) : Colors.white,
      drawer: _buildWazeDrawer(isDark),
      body: Stack(
        children: [
          // 1. FULL SCREEN MAP
          _buildMapSection(),

          // Hamburger menu button (top-left)
          if (!_isNavigating)
            Positioned(
              top: MediaQuery.of(context).padding.top + 12,
              left: 20,
              child: GestureDetector(
                onTap: () => Scaffold.of(context).openDrawer(),
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isDark ? VorianColors.ink.withOpacity(0.9) : Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.12),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Icon(Icons.menu_rounded, color: isDark ? Colors.white : Colors.black87, size: 22),
                ),
              ),
            ),


          // UBER STYLE TOP BANNER
          if (!_isNavigating) _buildUberTopBanner(isDark),

          // WAZE STYLE NAVIGATION OVERLAY
          if (_isNavigating)
            WazeNavigationOverlay(
              nextInstruction: _nextInstruction,
              distanceToNext: _distanceToNext,
              eta: _eta,
              remainingTime: _remainingTime,
              remainingDistance: _remainingDistance,
              onStopTap: () {
                setState(() => _isNavigating = false);
              },
              onArrivedTap: () {
                _actualizarEstado('DELIVERED');
              },
              onOpenWazeTap: () async {
                if (_pedidoAsignado == null) return;
                final double? dLat = _pedidoAsignado!['destinationLatitude'] ??
                    _pedidoAsignado!['delivery_latitude'];
                final double? dLng = _pedidoAsignado!['destinationLongitude'] ??
                    _pedidoAsignado!['delivery_longitude'];
                if (dLat != null && dLng != null) {
                  final url = Uri.parse('waze://?ll=$dLat,$dLng&navigate=yes');
                  if (await canLaunchUrl(url)) {
                    await launchUrl(url);
                  } else {
                    // Fallback to Google Maps
                    final gMapsUrl =
                        Uri.parse('google.navigation:q=$dLat,$dLng');
                    if (await canLaunchUrl(gMapsUrl)) {
                      await launchUrl(gMapsUrl);
                    }
                  }
                }
              },
            )
          else ...[
            // Shipment Preview / Offer Bottom Sheet
            if (_pedidoAsignado != null || _ofertaDisponible != null)
              Positioned(
                bottom: 135, // Elevado para evitar BottomNavigationBar
                left: 16,
                right: 16,
                child: _buildWazeShipmentPreview(isDark),
              )
            else ...[
              // UBER STYLE GO BUTTON (at the bottom above BottomNavigationBar)
              Positioned(
                bottom: 135,
                left: 0,
                right: 0,
                child: _buildUberGoButton(isDark),
              ),
            ],

            // Center Map Button
            Positioned(
              right: 20,
              bottom: (_pedidoAsignado != null || _ofertaDisponible != null)
                  ? 320
                  : 225,
              child: _glassButton(
                icon: Icons.my_location_rounded,
                onTap: _centrarMapaEnUsuario,
                isDark: isDark,
              ),
            ),

          ],

          if (_isUploadingPOD)
            Positioned.fill(
              child: Container(
                color: Colors.black.withOpacity(0.6),
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                    decoration: BoxDecoration(
                      color: isDark ? VorianColors.surface : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const CircularProgressIndicator(color: VorianColors.primary),
                        const SizedBox(height: 16),
                        Text(
                          "Subiendo pruebas de entrega...",
                          style: GoogleFonts.quicksand(
                            fontWeight: FontWeight.bold,
                            color: isDark ? Colors.white : Colors.black87,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

          // 4. LOADING OVERLAY
          if (_isFetchingRoute) _buildLoadingOverlay(isDark),

          // 5. NEW TRIP NOTIFICATION OVERLAY
          if (_showNewTripOverlay && _newTripData != null)
            _buildNewTripOverlay(_newTripData!, isDark),
        ],
      ),
    );
  }

  // ── Widget: Overlay de Nuevo Viaje Asignado ────────────────────────────
  Widget _buildNewTripOverlay(Map<String, dynamic> trip, bool isDark) {
    final origin = trip['pickup_address'] ?? trip['originAddress'] ?? 'Origen';
    final destination = trip['delivery_address'] ?? trip['destinationAddress'] ?? 'Destino';

    return Positioned.fill(
      child: GestureDetector(
        onTap: () => setState(() => _showNewTripOverlay = false),
        child: Container(
          color: Colors.black.withOpacity(0.55),
          child: Center(
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0.0, end: 1.0),
              duration: const Duration(milliseconds: 500),
              curve: Curves.elasticOut,
              builder: (context, scale, child) =>
                  Transform.scale(scale: scale, child: child),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Ondas de radar animadas
                  ...List.generate(3, (i) => _buildPulseRing(i)),

                  // Card central
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Container(
                      clipBehavior: Clip.antiAlias,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.6),
                            blurRadius: 40,
                            spreadRadius: 8,
                            offset: const Offset(0, 20),
                          ),
                        ],
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                            // ── Top Section (White) ──
                            Container(
                              color: Colors.white,
                              padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
                              child: Column(
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                        decoration: BoxDecoration(
                                          color: Colors.black,
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                        child: Text(
                                          '¡NUEVO VIAJE!',
                                          style: GoogleFonts.quicksand(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w900,
                                            fontSize: 11,
                                            letterSpacing: 1.2,
                                          ),
                                        ),
                                      ),
                                      const Icon(Icons.info_outline_rounded, color: Colors.black26),
                                    ],
                                  ),
                                  const SizedBox(height: 24),
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.center,
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              "Viaje Asignado",
                                              style: GoogleFonts.quicksand(
                                                fontSize: 24,
                                                fontWeight: FontWeight.w900,
                                                color: Colors.black,
                                                letterSpacing: -0.5,
                                              ),
                                            ),
                                            const SizedBox(height: 6),
                                            Text(
                                              "Tienes una carga lista",
                                              style: GoogleFonts.quicksand(
                                                fontSize: 14,
                                                color: Colors.grey.shade600,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Icon(
                                        Icons.local_shipping_rounded,
                                        size: 72,
                                        color: Colors.grey.shade300,
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            // ── Bottom Section (Dark) ──
                            Container(
                              width: double.infinity,
                              color: const Color(0xFF14141A),
                              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
                              child: Column(
                                children: [
                                  // Timeline Pick-up
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Column(
                                        children: [
                                          Container(
                                            width: 12,
                                            height: 12,
                                            margin: const EdgeInsets.only(top: 4),
                                            decoration: BoxDecoration(
                                              color: Colors.white,
                                              shape: BoxShape.circle,
                                              border: Border.all(color: Colors.grey.shade800, width: 3),
                                            ),
                                          ),
                                          Container(
                                            width: 2,
                                            height: 35,
                                            color: Colors.grey.shade700,
                                          ),
                                        ],
                                      ),
                                      const SizedBox(width: 16),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              "Punto de carga",
                                              style: GoogleFonts.quicksand(
                                                fontSize: 12,
                                                color: Colors.grey.shade500,
                                              ),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              origin,
                                              style: GoogleFonts.quicksand(
                                                fontSize: 14,
                                                color: Colors.white,
                                                fontWeight: FontWeight.w600,
                                              ),
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  // Timeline Drop-off
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Container(
                                        width: 12,
                                        height: 12,
                                        margin: const EdgeInsets.only(top: 4),
                                        decoration: const BoxDecoration(
                                          color: Colors.white,
                                          shape: BoxShape.rectangle,
                                        ),
                                      ),
                                      const SizedBox(width: 16),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              "Punto de entrega",
                                              style: GoogleFonts.quicksand(
                                                fontSize: 12,
                                                color: Colors.grey.shade500,
                                              ),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              destination,
                                              style: GoogleFonts.quicksand(
                                                fontSize: 14,
                                                color: Colors.white,
                                                fontWeight: FontWeight.w600,
                                              ),
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 32),
                                  // Button
                                  SizedBox(
                                    width: double.infinity,
                                    height: 50,
                                    child: ElevatedButton(
                                      onPressed: () => setState(() => _showNewTripOverlay = false),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.white,
                                        foregroundColor: Colors.black,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                        elevation: 0,
                                      ),
                                      child: Text(
                                        "VER DETALLES",
                                        style: GoogleFonts.quicksand(
                                          fontWeight: FontWeight.w900,
                                          fontSize: 15,
                                          letterSpacing: 1.2,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  TextButton(
                                    onPressed: () => setState(() => _showNewTripOverlay = false),
                                    child: Text(
                                      "Cerrar",
                                      style: GoogleFonts.quicksand(
                                        color: Colors.white54,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
    );
  }

  Widget _buildOverlayRouteRow({
    required IconData icon,
    required Color color,
    required String label,
    required String address,
    required bool isDark,
  }) {
    return Row(
      children: [
        Icon(icon, color: color, size: 18),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: GoogleFonts.quicksand(
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  color: isDark ? Colors.white.withOpacity(0.4) : Colors.black.withOpacity(0.38),
                  letterSpacing: 1.0,
                ),
              ),
              Text(
                address,
                style: GoogleFonts.quicksand(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isDark ? Colors.white : const Color(0xFF1A1A1A),
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPulseRing(int index) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.8, end: 2.5),
      duration: Duration(milliseconds: 1800 + (index * 600)),
      curve: Curves.easeOut,
      builder: (context, scale, child) {
        final opacity = (1.0 - ((scale - 0.8) / 1.7)).clamp(0.0, 0.5);
        return Transform.scale(
          scale: scale,
          child: Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: VorianColors.pinkStrong.withOpacity(opacity),
                width: 2,
              ),
            ),
          ),
        );
      },
    );
  }

  // --- UBER STYLE UI COMPONENTS ---
  Widget _buildUberTopBanner(bool isDark) {
    return Positioned(
      top: MediaQuery.of(context).padding.top + 12,
      right: 20,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(30),
              border: Border.all(color: Colors.black.withOpacity(0.05)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.06),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                )
              ],
            ),
            child: Text(
              _isAvailable ? "Online" : "Offline",
              style: GoogleFonts.quicksand(
                fontWeight: FontWeight.w800,
                fontSize: 15,
                color: Colors.black87,
              ),
            ),
          ),
          const SizedBox(width: 12),
          GestureDetector(
            onTap: () => _toggleOnline(!_isAvailable),
            child: Container(
              padding: const EdgeInsets.all(2),
              width: 54,
              height: 32,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                color: _isAvailable ? VorianColors.green : Colors.grey.shade300,
              ),
              child: AnimatedAlign(
                duration: const Duration(milliseconds: 200),
                alignment: _isAvailable ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  width: 28,
                  height: 28,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black12,
                        blurRadius: 2,
                        offset: Offset(0, 1),
                      )
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUberGoButton(bool isDark) {
    return Center(
      child: Stack(
        alignment: Alignment.center,
        children: [
          if (_isAvailable)
            TweenAnimationBuilder<double>(
              tween: Tween<double>(begin: 0.8, end: 1.5),
              duration: const Duration(seconds: 2),
              curve: Curves.easeInOut,
              builder: (context, scale, child) {
                return Transform.scale(
                  scale: scale,
                  child: Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.black.withOpacity(0.08 * (1.5 - scale)),
                    ),
                  ),
                );
              },
            ),
          
          GestureDetector(
            onTap: () => _toggleOnline(!_isAvailable),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              width: 90,
              height: 90,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _isAvailable ? Colors.white : const Color(0xFF1E1E1E),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(_isAvailable ? 0.15 : 0.4),
                    blurRadius: 20,
                    spreadRadius: 2,
                    offset: const Offset(0, 10),
                  )
                ],
                border: Border.all(
                  color: _isAvailable ? Colors.black.withOpacity(0.08) : Colors.white.withOpacity(0.12),
                  width: 3,
                ),
              ),
              child: Center(
                child: Image.asset(
                  'assets/images/vorianwhite.png',
                  width: 42,
                  height: 42,
                  color: _isAvailable ? const Color(0xFF1E1E1E) : Colors.white,
                  colorBlendMode: BlendMode.srcIn,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDriverStatusCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 20,
            offset: const Offset(0, 10),
          )
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: VorianColors.pinkStrong.withOpacity(0.1),
                child: Text(
                  _driverName != null && _driverName!.isNotEmpty ? _driverName![0].toUpperCase() : 'V',
                  style: GoogleFonts.quicksand(
                    color: VorianColors.pinkStrong,
                    fontWeight: FontWeight.w900,
                    fontSize: 18,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _driverName ?? "Conductor",
                      style: GoogleFonts.quicksand(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: Colors.black87,
                      ),
                    ),
                    Text(
                      "Nivel Básico",
                      style: GoogleFonts.quicksand(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    "3 Entregas",
                    style: GoogleFonts.quicksand(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: Colors.black87,
                    ),
                  ),
                  Text(
                    "Hoy",
                    style: GoogleFonts.quicksand(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey.shade500,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF1C1C1E),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildDriverStatItem("20%", "Aceptado"),
                Container(width: 1, height: 24, color: Colors.white24),
                _buildDriverStatItem("4.95", "Calificación"),
                Container(width: 1, height: 24, color: Colors.white24),
                _buildDriverStatItem("3%", "Cancelado"),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDriverStatItem(String value, String label) {
    return Column(
      children: [
        Text(
          value,
          style: GoogleFonts.quicksand(
            fontSize: 16,
            fontWeight: FontWeight.w900,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: GoogleFonts.quicksand(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: Colors.white70,
          ),
        ),
      ],
    );
  }
  // --------------------------------

  Widget _buildWazeDrawer(bool isDark) {
    return Drawer(
      backgroundColor: VorianColors.ink,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.only(top: 60, left: 24, right: 24, bottom: 28),
            decoration: BoxDecoration(
              color: VorianColors.card,
              border: Border(bottom: BorderSide(color: VorianColors.border)),
            ),
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: VorianColors.surface,
                    borderRadius: BorderRadius.circular(26),
                    border: Border.all(color: VorianColors.border),
                  ),
                  child: const Icon(Icons.person_rounded, color: Colors.white, size: 26),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _driverName ?? 'Conductor',
                        style: GoogleFonts.quicksand(
                          fontWeight: FontWeight.w700,
                          fontSize: 16,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _isIndependent ? 'Conductor Independiente' : 'Conductor de Empresa',
                        style: GoogleFonts.quicksand(
                          fontSize: 12,
                          color: VorianColors.white60,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          _drawerItem(Icons.history_rounded, 'Mis Viajes', () {}),
          _drawerItem(Icons.settings_rounded, 'Ajustes', () {}),
          const Spacer(),
          Container(
            margin: const EdgeInsets.all(20),
            child: _drawerItem(
              Icons.logout_rounded, 'Cerrar Sesión',
              () => Supabase.instance.client.auth.signOut(),
              danger: true,
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _drawerItem(IconData icon, String label, VoidCallback onTap, {bool danger = false}) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
      leading: Icon(icon, color: danger ? VorianColors.red : VorianColors.white60, size: 22),
      title: Text(
        label,
        style: GoogleFonts.quicksand(
          fontWeight: FontWeight.w600,
          fontSize: 15,
          color: danger ? VorianColors.red : Colors.white,
        ),
      ),
      onTap: onTap,
    );
  }

  Widget _buildMiniAvailabilityToggle(bool isDark) {
    return GestureDetector(
      onTap: () => _toggleOnline(!_isAvailable),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: _isAvailable ? VorianColors.primary : VorianColors.surface,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: _isAvailable ? VorianColors.primary : VorianColors.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              _isAvailable ? Icons.wifi_rounded : Icons.wifi_off_rounded,
              size: 16,
              color: _isAvailable ? Colors.white : VorianColors.white60,
            ),
            const SizedBox(width: 8),
            Text(
              _isAvailable ? "EN LÍNEA" : "OFFLINE",
              style: GoogleFonts.quicksand(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: _isAvailable ? Colors.white : VorianColors.white60,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWazeShipmentPreview(bool isDark) {
    final shipment = _pedidoAsignado ?? _ofertaDisponible;
    if (shipment == null) return const SizedBox.shrink();

    final isOffer = _pedidoAsignado == null;
    String st = shipment['status'] ?? '';
    final primaryColor = VorianColors.pinkStrong;
    final headerTextColor = isDark ? Colors.white : Colors.black;
    final headerIconBgColor = isDark ? Colors.white.withOpacity(0.08) : const Color(0xFFF2F2F7);

    // ── Datos por estado ──────────────────────────────────────────
    String title = 'Envío Activo';
    String subtitle = 'Tu viaje actual';
    String? slideText;
    bool requiresPin = false;
    String? pinField;
    String? nextStatus;
    String pinTitle = 'Código de Verificación';
    String pinSubtitle = 'Ingresa el PIN de 4 dígitos';
    bool showNavButton = false;

    String timeEstimateStr = "Por Confirmar";
    bool isImmediate = shipment['is_asap'] == true || shipment['is_asap'] == 'true';
    
    // Fallback if there is a 'details' json or 'createdAt' root field
    String? dateStr;
    if (shipment['details'] != null && shipment['details']['pickupDate'] != null) {
      dateStr = shipment['details']['pickupDate'];
    } else {
      dateStr = shipment['pickup_date'] ?? shipment['createdAt'] ?? shipment['created_at'];
    }

    if (dateStr != null) {
      try {
        final dt = DateTime.parse(dateStr).toLocal();
        
        // If not explicitly marked as ASAP, check if it's within 2 hours
        if (!isImmediate) {
          final diff = dt.difference(DateTime.now());
          if (diff.inHours <= 2) {
            isImmediate = true;
          }
        }

        final monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        final monthStr = monthNames[dt.month - 1];
        final dayStr = dt.day.toString().padLeft(2, '0');
        
        final hour = dt.hour;
        final minute = dt.minute.toString().padLeft(2, '0');
        final ampm = hour >= 12 ? 'pm' : 'am';
        final h12 = hour % 12 == 0 ? 12 : hour % 12;
        
        // Asumir una ventana de recogida de 30 mins
        final endDt = dt.add(const Duration(minutes: 30));
        final eHour = endDt.hour;
        final eMinute = endDt.minute.toString().padLeft(2, '0');
        final eAmpm = eHour >= 12 ? 'pm' : 'am';
        final eH12 = eHour % 12 == 0 ? 12 : eHour % 12;
        
        timeEstimateStr = "$dayStr $monthStr • $h12:$minute$ampm - $eH12:$eMinute$eAmpm";
      } catch (e) {
        // Fallback silently if unparseable
      }
    }

    if (isOffer || st == 'PENDING') {
      title = 'Nueva Carga';
      subtitle = 'Revisando detalles';
    } else if (st == 'ACCEPTED') {
      title = 'Viaje Asignado';
      subtitle = 'Ir al punto de origen';
      slideText = 'INICIAR VIAJE';
      nextStatus = 'EN_ROUTE_TO_PICKUP';
    } else if (st == 'EN_ROUTE_TO_PICKUP') {
      title = 'Hacia el Origen';
      subtitle = 'Conduciendo a recogida';
      showNavButton = true;
      slideText = 'LLEGUÉ AL ORIGEN';
      nextStatus = 'ARRIVED_AT_PICKUP';
    } else if (st == 'ARRIVED_AT_PICKUP') {
      title = 'En Punto de Recogida';
      subtitle = 'Carga los paquetes';
      slideText = 'CARGA LISTA';
      nextStatus = 'IN_TRANSIT';
      requiresPin = true;
      pinField = 'pickup_code';
      pinTitle = 'Código de Recogida';
      pinSubtitle = 'Ingresa el PIN que te dio el cliente para confirmar la carga';
    } else if (st == 'IN_TRANSIT') {
      title = 'En Tránsito';
      subtitle = 'Hacia el destino final';
      showNavButton = true;
      slideText = 'LLEGUÉ AL DESTINO';
      nextStatus = 'ARRIVED_AT_DROPOFF';
    } else if (st == 'ARRIVED_AT_DROPOFF') {
      title = 'En el Destino';
      subtitle = 'Descarga y entrega los paquetes';
      slideText = 'ENTREGAR CARGA';
      nextStatus = 'COMPLETED';
      requiresPin = true;
      pinField = 'delivery_code';
      pinTitle = 'Código de Entrega';
      pinSubtitle = 'Ingresa el PIN que te dio el cliente para confirmar la entrega';
    }

    final origin = shipment['pickup_address'] ?? shipment['originAddress'] ?? 'Origen Desconocido';
    final destination = shipment['delivery_address'] ?? shipment['destinationAddress'] ?? 'Destino Desconocido';

    return GestureDetector(
      onVerticalDragEnd: (details) {
        if (details.primaryVelocity != null && details.primaryVelocity! > 50) {
          setState(() => _isCardExpanded = false);
        } else if (details.primaryVelocity != null && details.primaryVelocity! < -50) {
          setState(() => _isCardExpanded = true);
        }
      },
      onTap: () {
        if (!_isCardExpanded) setState(() => _isCardExpanded = true);
      },
      child: Container(
        clipBehavior: Clip.antiAlias,
        width: double.infinity,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(isDark ? 0.4 : 0.08),
              blurRadius: 35,
              spreadRadius: 2,
              offset: const Offset(0, 12),
            ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // ── Sección Superior (Blanca) ──
              Container(
                color: Colors.white,
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 36,
                        height: 4,
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          color: Colors.black12,
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                title,
                                style: GoogleFonts.quicksand(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.black,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                subtitle,
                                style: GoogleFonts.quicksand(
                                  fontSize: 13,
                                  color: Colors.grey.shade600,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 12),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    "Fecha de recogida",
                                    style: GoogleFonts.quicksand(
                                      color: Colors.black,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 15,
                                    ),
                                  ),
                                  if (isImmediate)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: Colors.redAccent.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(6),
                                        border: Border.all(color: Colors.redAccent, width: 1.5),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Icon(Icons.warning_amber_rounded, color: Colors.redAccent, size: 14),
                                          const SizedBox(width: 4),
                                          Text(
                                            "INMEDIATO",
                                            style: GoogleFonts.quicksand(
                                              color: Colors.redAccent,
                                              fontWeight: FontWeight.w800,
                                              fontSize: 10,
                                              letterSpacing: 0.5,
                                            ),
                                          ),
                                        ],
                                      ),
                                    )
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                timeEstimateStr,
                                style: GoogleFonts.quicksand(
                                  color: Colors.black,
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: -0.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                        // Icono circular
                        Container(
                          width: 48,
                          height: 48,
                          decoration: const BoxDecoration(
                            color: Color(0xFFF2F2F7),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.local_shipping_rounded, color: Colors.black, size: 24),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              
              // ── Sección Inferior (Oscura) ──
              AnimatedCrossFade(
                firstChild: Container(
                  width: double.infinity,
                  color: isDark ? const Color(0xFF14141A) : const Color(0xFF1C1C1E),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
                  child: Column(
                    children: [
                      // Timeline Pick-up
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Column(
                            children: [
                              Container(
                                width: 12,
                                height: 12,
                                margin: const EdgeInsets.only(top: 4),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.grey.shade800, width: 3),
                                ),
                              ),
                              Container(
                                width: 2,
                                height: 35,
                                color: Colors.grey.shade700,
                              ),
                            ],
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  "Punto de carga",
                                  style: GoogleFonts.quicksand(fontSize: 12, color: Colors.grey.shade500),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  origin,
                                  style: GoogleFonts.quicksand(fontSize: 14, color: Colors.white, fontWeight: FontWeight.w600),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      // Timeline Drop-off
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Column(
                            children: [
                              Container(
                                width: 12,
                                height: 12,
                                margin: const EdgeInsets.only(top: 4),
                                decoration: BoxDecoration(
                                  color: Colors.black,
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.white, width: 3),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  "Punto de entrega",
                                  style: GoogleFonts.quicksand(fontSize: 12, color: Colors.grey.shade500),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  destination,
                                  style: GoogleFonts.quicksand(fontSize: 14, color: Colors.white, fontWeight: FontWeight.w600),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),

                      // Pod Controls
                      if (st == 'ARRIVED_AT_PICKUP') ...[
                        const SizedBox(height: 24),
                        Row(
                          children: [
                            Text("Evidencia de Recogida", style: GoogleFonts.quicksand(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
                          ],
                        ),
                        const SizedBox(height: 12),
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: Icon(_podRecogidaCompleto ? Icons.check_circle : Icons.camera_alt, color: _podRecogidaCompleto ? VorianColors.green : Colors.white),
                          title: Text(_podRecogidaCompleto ? "Foto capturada" : "Tomar foto de la carga", style: GoogleFonts.quicksand(color: Colors.white, fontWeight: FontWeight.w600)),
                          trailing: ElevatedButton(
                            onPressed: _handlePhotoCapture,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _podRecogidaCompleto ? VorianColors.green.withOpacity(0.2) : Colors.white12,
                              foregroundColor: _podRecogidaCompleto ? VorianColors.green : Colors.white,
                              elevation: 0,
                            ),
                            child: Text(_podRecogidaCompleto ? "REPETIR" : "TOMAR FOTO"),
                          ),
                        ),
                      ],
                      
                      if (st == 'ARRIVED_AT_DROPOFF') ...[
                        const SizedBox(height: 24),
                        Row(
                          children: [
                            Text("Evidencia de Entrega", style: GoogleFonts.quicksand(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
                          ],
                        ),
                        const SizedBox(height: 12),
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: Icon(_fotoEntrega != null ? Icons.check_circle : Icons.camera_alt, color: _fotoEntrega != null ? VorianColors.green : Colors.white),
                          title: Text(_fotoEntrega != null ? "Foto capturada" : "Tomar foto de entrega", style: GoogleFonts.quicksand(color: Colors.white, fontWeight: FontWeight.w600)),
                          trailing: ElevatedButton(
                            onPressed: _handlePhotoCapture,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _fotoEntrega != null ? VorianColors.green.withOpacity(0.2) : Colors.white12,
                              foregroundColor: _fotoEntrega != null ? VorianColors.green : Colors.white,
                              elevation: 0,
                            ),
                            child: Text(_fotoEntrega != null ? "REPETIR" : "TOMAR FOTO"),
                          ),
                        ),
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: Icon(_firmaController != null && _firmaController!.isNotEmpty ? Icons.check_circle : Icons.draw, color: _firmaController != null && _firmaController!.isNotEmpty ? VorianColors.green : Colors.white),
                          title: Text(_firmaController != null && _firmaController!.isNotEmpty ? "Firma capturada" : "Firma del cliente", style: GoogleFonts.quicksand(color: Colors.white, fontWeight: FontWeight.w600)),
                          trailing: ElevatedButton(
                            onPressed: _handleSignatureCapture,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _firmaController != null && _firmaController!.isNotEmpty ? VorianColors.green.withOpacity(0.2) : Colors.white12,
                              foregroundColor: _firmaController != null && _firmaController!.isNotEmpty ? VorianColors.green : Colors.white,
                              elevation: 0,
                            ),
                            child: Text(_firmaController != null && _firmaController!.isNotEmpty ? "REPETIR" : "FIRMAR"),
                          ),
                        ),
                      ],

                      const SizedBox(height: 32),
                      
                      // Action Buttons
                      Row(
                        children: [
                          if (showNavButton) ...[
                            GestureDetector(
                              onTap: _iniciarRecorridoClick,
                              child: Container(
                                height: 54,
                                width: 54,
                                decoration: BoxDecoration(
                                  color: Colors.white12,
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: const Icon(Icons.navigation, color: Colors.white, size: 24),
                              ),
                            ),
                            const SizedBox(width: 12),
                          ],
                          if (isOffer || st == 'PENDING') ...[
                            // DECLINE BUTTON
                            Expanded(
                              child: OutlinedButton(
                                onPressed: () {
                                  setState(() {
                                    _ofertaDisponible = null;
                                  });
                                },
                                style: OutlinedButton.styleFrom(
                                  side: BorderSide(color: Colors.white24, width: 1.5),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                  padding: const EdgeInsets.symmetric(vertical: 18),
                                ),
                                child: Text(
                                  "Rechazar",
                                  style: GoogleFonts.quicksand(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 16,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            // ACCEPT BUTTON
                            Expanded(
                              child: ElevatedButton(
                                onPressed: () => _aceptarOferta(shipment['id']),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                  padding: const EdgeInsets.symmetric(vertical: 18),
                                  elevation: 0,
                                ),
                                child: Text(
                                  "Aceptar",
                                  style: GoogleFonts.quicksand(
                                    color: Colors.black,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 16,
                                  ),
                                ),
                              ),
                            ),
                          ] else if (slideText != null)
                            Expanded(
                              child: SlideToConfirm(
                                text: slideText,
                                color: Colors.white,
                                textColor: Colors.black,
                                onConfirmed: () async {
                                  if (st == 'ARRIVED_AT_PICKUP' && !_podRecogidaCompleto) {
                                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Debes capturar la foto de recogida primero.')));
                                    return;
                                  }
                                  if (st == 'ARRIVED_AT_DROPOFF' && !_podEntregaCompleto) {
                                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Debes capturar la foto y la firma del cliente primero.')));
                                    return;
                                  }

                                  if (requiresPin && pinField != null) {
                                    final correctPin = shipment[pinField]?.toString() ?? '';
                                    if (correctPin.isEmpty) {
                                      await _actualizarEstado(nextStatus!);
                                      return;
                                    }
                                    final verified = await PinVerificationDialog.show(
                                      context,
                                      correctPin: correctPin,
                                      title: pinTitle,
                                      subtitle: pinSubtitle,
                                      accentColor: primaryColor,
                                    );
                                    if (verified) await _actualizarEstado(nextStatus!);
                                  } else {
                                    await _actualizarEstado(nextStatus!);
                                  }
                                },
                              ),
                            ),
                        ],
                      )
                    ],
                  ),
                ),
                secondChild: const SizedBox.shrink(),
                crossFadeState: _isCardExpanded
                    ? CrossFadeState.showFirst
                    : CrossFadeState.showSecond,
                duration: const Duration(milliseconds: 280),
                sizeCurve: Curves.easeInOut,
              ),
            ],
          ),
        ),
    );
  }

  Widget _buildMockAddressField(String text, bool isOrigin, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? VorianColors.card : const Color(0xFFF7F7FA),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                color: isDark ? Colors.white : Colors.black87,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 8),
          Icon(Icons.edit, size: 16, color: Colors.grey.shade400),
          const SizedBox(width: 16),
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: isOrigin ? VorianColors.amber : VorianColors.pinkStrong,
                width: 3,
              ),
            ),
          )
        ],
      ),
    );
  }

  Future<void> _buscarSugerencias(String query) async {
    if (query.length < 3) {
      setState(() => _sugerenciasSearch = []);
      return;
    }

    final url =
        "https://api.mapbox.com/geocoding/v5/mapbox.places/${Uri.encodeComponent(query)}.json?access_token=$mapboxToken&limit=5&country=cl&proximity=${_driverLocation?.longitude},${_driverLocation?.latitude}";

    try {
      final response = await http.get(Uri.parse(url));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (mounted) {
          setState(() {
            _sugerenciasSearch = data['features'] ?? [];
          });
        }
      }
    } catch (_) {}
  }

  Future<void> _buscarYIrADestino(String query) async {
    if (query.isEmpty) return;
    Navigator.pop(context); // Cerrar modal de búsqueda

    final String proximity = _driverLocation != null
        ? "&proximity=${_driverLocation!.longitude},${_driverLocation!.latitude}"
        : "&proximity=-70.6693,-33.4489"; // Santiago fallback

    final url =
        "https://api.mapbox.com/geocoding/v5/mapbox.places/${Uri.encodeComponent(query)}.json?access_token=$mapboxToken&limit=1&country=cl$proximity";

    try {
      final response = await http.get(Uri.parse(url));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['features'] != null && data['features'].isNotEmpty) {
          final feature = data['features'][0];
          final List coords = feature['geometry']['coordinates'];
          final String placeName = feature['place_name'];

          final dLng = coords[0].toDouble();
          final dLat = coords[1].toDouble();

          // Trazar ruta y activar navegación
          _trazarRutaRoja(_driverLocation?.latitude ?? -33.4489,
              _driverLocation?.longitude ?? -70.6693, dLat, dLng);

          setState(() {
            _isNavigating = true;
            _nextInstruction = "Hacia $placeName";
            _eta = _calcularEtaSimulado();
          });
          _centrarNavegacion3D();
        } else {
          _mostrarErrorRuta("No se encontró el destino");
        }
      }
    } catch (e) {
      _mostrarErrorRuta("Error en la búsqueda");
    }
  }

  void _showWazeSearchModal(bool isDark) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => StatefulBuilder(builder: (context, setModalState) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.9,
          decoration: BoxDecoration(
            color: isDark ? VorianColors.ink : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(25)),
          ),
          child: Column(
            children: [
              const SizedBox(height: 12),
              Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                      color: Colors.grey.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(2))),
              Padding(
                padding: const EdgeInsets.all(20),
                child: TextField(
                  autofocus: true,
                  style: GoogleFonts.quicksand(
                      color: isDark ? Colors.white : Colors.black),
                  onChanged: (value) async {
                    await _buscarSugerencias(value);
                    setModalState(() {}); // Actualizar lista en el modal
                  },
                  onSubmitted: (value) => _buscarYIrADestino(value),
                  decoration: InputDecoration(
                    hintText: "¿A dónde vas?",
                    hintStyle: GoogleFonts.quicksand(color: Colors.grey),
                    prefixIcon:
                        const Icon(Icons.search, color: VorianColors.blue),
                    filled: true,
                    fillColor:
                        isDark ? VorianColors.white08 : Colors.grey.shade100,
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(15),
                        borderSide: BorderSide.none),
                  ),
                ),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  children: [
                    if (_sugerenciasSearch.isNotEmpty) ...[
                      Text("RESULTADOS",
                          style: GoogleFonts.quicksand(
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              color: VorianColors.blue,
                              letterSpacing: 1.2)),
                      const SizedBox(height: 10),
                      ..._sugerenciasSearch.map((f) => _searchResultItem(
                          f['text'] ?? "",
                          f['place_name'] ?? "",
                          Icons.location_on_rounded,
                          VorianColors.blue,
                          isDark)),
                      const Divider(height: 40),
                    ],
                    Text("FAVORITOS",
                        style: GoogleFonts.quicksand(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            color: Colors.grey,
                            letterSpacing: 1.2)),
                    const SizedBox(height: 15),
                    _searchResultItem(
                        "Tu casa",
                        "Av. Providencia 1234, Santiago",
                        Icons.home_rounded,
                        VorianColors.blue,
                        isDark),
                    _searchResultItem(
                        "Oficina Vorian",
                        "Las Condes 987, Santiago",
                        Icons.work_rounded,
                        VorianColors.purple,
                        isDark),
                  ],
                ),
              ),
            ],
          ),
        );
      }),
    );
  }

  Widget _searchResultItem(
      String title, String sub, IconData icon, Color color, bool isDark) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
            color: color.withOpacity(0.1), shape: BoxShape.circle),
        child: Icon(icon, color: color, size: 20),
      ),
      title: Text(title,
          style: GoogleFonts.quicksand(
              fontWeight: FontWeight.w700,
              color: isDark ? Colors.white : Colors.black)),
      subtitle:
          Text(sub, style: GoogleFonts.quicksand(fontSize: 12, color: Colors.grey)),
      onTap: () => _buscarYIrADestino(title),
    );
  }

  Widget _glassButton(
      {required IconData icon,
      required VoidCallback onTap,
      required bool isDark}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: VorianColors.card,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: VorianColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.4),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Icon(icon, color: Colors.white, size: 20),
      ),
    );
  }

  Widget _buildIniciarRecorridoBtn(bool isDark) {
    return SizedBox(
      height: 56,
      child: ElevatedButton(
        onPressed: _iniciarRecorridoClick,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          elevation: 0,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.local_shipping_rounded, size: 22, color: Colors.black),
            const SizedBox(width: 12),
            Text(
              'INICIAR RECORRIDO',
              style: GoogleFonts.quicksand(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: Colors.black,
                  letterSpacing: 0.8),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoadingOverlay(bool isDark) {
    return Container(
      color: Colors.black.withOpacity(0.7),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(
              width: 40,
              height: 40,
              child: CircularProgressIndicator(
                color: Colors.white,
                strokeWidth: 2,
              ),
            ),
            const SizedBox(height: 18),
            Text(
              'Calculando ruta…',
              style: GoogleFonts.quicksand(
                fontWeight: FontWeight.w600,
                fontSize: 14,
                color: Colors.white70,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOfflineDashboard() {
    return Positioned.fill(
      child: Container(
        color: VorianColors.ink,
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.only(top: 185, left: 20, right: 20, bottom: 40),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'GESTIÓN',
                style: GoogleFonts.quicksand(
                  color: VorianColors.white60,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 2.0,
                ),
              ),
              const SizedBox(height: 16),
              _menuItem(Icons.history_rounded, 'Historial de Viajes',
                  'Revisa tus envíos pasados y pagos', false),
              _menuItem(Icons.bar_chart_rounded, 'Métricas',
                  'Estadísticas detalladas de conducción', false),
              _menuItem(Icons.local_shipping_rounded, 'Mi Vehículo',
                  'Documentación y estado técnico', false),
              _menuItem(Icons.headset_mic_rounded, 'Soporte',
                  'Habla con un asesor 24/7', false),
              const SizedBox(height: 40),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: () => _toggleOnline(true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                    elevation: 0,
                  ),
                  child: Text(
                    'INICIAR TURNO',
                    style: GoogleFonts.quicksand(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: Colors.black,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Center(
                child: Text(
                  'Tus envíos aparecerán automáticamente al conectarte',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.quicksand(
                    color: VorianColors.white30,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sectionLabel(String text, bool isDark) {
    return Text(
      text,
      style: GoogleFonts.quicksand(
        color: isDark ? VorianColors.white40 : Colors.black45,
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 2.0,
      ),
    );
  }

  Widget _statCard(String title, String value, IconData icon, bool isDark,
      {Color accent = VorianColors.green}) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isDark ? VorianColors.surface : Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
              color: isDark
                  ? VorianColors.border
                  : Colors.black.withOpacity(0.06)),
          boxShadow: [
            BoxShadow(
                color: accent.withOpacity(0.08),
                blurRadius: 20,
                offset: const Offset(0, 4))
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(9),
              decoration: BoxDecoration(
                color: accent.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: accent, size: 22),
            ),
            const SizedBox(height: 14),
            Text(value,
                style: GoogleFonts.quicksand(
                  color: isDark ? Colors.white : Colors.black,
                  fontSize: 26,
                  fontWeight: FontWeight.w900,
                )),
            const SizedBox(height: 4),
            Text(title,
                style: GoogleFonts.quicksand(
                  color: isDark ? VorianColors.white40 : Colors.black45,
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  height: 1.4,
                  letterSpacing: 0.3,
                )),
          ],
        ),
      ),
    );
  }

  Widget _menuItem(IconData icon, String title, String subtitle, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 2),
      decoration: BoxDecoration(
        color: VorianColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: VorianColors.border),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        leading: Icon(icon, color: VorianColors.white60, size: 20),
        title: Text(title,
            style: GoogleFonts.quicksand(
              color: Colors.white,
              fontWeight: FontWeight.w600,
              fontSize: 14,
            )),
        subtitle: Text(subtitle,
            style: GoogleFonts.quicksand(
              color: VorianColors.white60,
              fontSize: 12,
              fontWeight: FontWeight.w400,
            )),
        trailing: Icon(Icons.arrow_forward_ios_rounded,
            color: VorianColors.white30, size: 13),
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Próximamente disponible.',
                  style: GoogleFonts.quicksand(fontWeight: FontWeight.w600, color: Colors.black)),
              backgroundColor: Colors.white,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
          );
        },
      ),
    );
  }

  Widget _buildFloatingHeader() {
    final bool isDark =
        MediaQuery.of(context).platformBrightness == Brightness.dark;
    return Positioned(
      top: 52,
      left: 16,
      right: 16,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
          child: Container(
            padding: const EdgeInsets.fromLTRB(18, 14, 14, 14),
            decoration: BoxDecoration(
              color: isDark
                  ? VorianColors.card.withOpacity(0.92)
                  : Colors.white.withOpacity(0.92),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: isDark
                    ? VorianColors.border
                    : Colors.black.withOpacity(0.06),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(isDark ? 0.6 : 0.12),
                  blurRadius: 24,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // ── Top Row: Logo + Driver Info + Toggle ─────────────
                Row(
                  children: [
                    // Logo avatar (Tappable for Profile)
                    GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => const DriverProfilePage(),
                          ),
                        );
                      },
                      child: Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: isDark
                              ? VorianColors.white08
                              : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: Image.asset(
                              'assets/images/vorian.png',
                              fit: BoxFit.contain,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Driver name + label
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          RichText(
                            text: TextSpan(
                              style: GoogleFonts.quicksand(
                                fontSize: 10,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 1.8,
                              ),
                              children: [
                                TextSpan(
                                    text: "VORIAN ",
                                    style:
                                        TextStyle(color: VorianColors.purple)),
                                TextSpan(
                                    text: "FREIGHT",
                                    style: TextStyle(
                                        color: VorianColors.pinkLight)),
                              ],
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _driverName ?? "Conductor",
                            style: GoogleFonts.quicksand(
                              fontSize: 17,
                              fontWeight: FontWeight.w900,
                              color: isDark ? Colors.white : Colors.black,
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Online/Offline toggle pill
                    GestureDetector(
                      onTap: () => _toggleOnline(!_isAvailable),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        curve: Curves.easeInOut,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: _isAvailable
                              ? VorianColors.primaryDim
                              : (isDark
                                  ? VorianColors.white08
                                  : Colors.grey.shade100),
                          borderRadius: BorderRadius.circular(30),
                          border: Border.all(
                            color: _isAvailable
                                ? VorianColors.primary.withOpacity(0.4)
                                : Colors.transparent,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: _isAvailable
                                    ? VorianColors.primary
                                    : Colors.grey,
                                shape: BoxShape.circle,
                                boxShadow: _isAvailable
                                    ? [
                                        BoxShadow(
                                            color: VorianColors.primary,
                                            blurRadius: 6)
                                      ]
                                    : null,
                              ),
                            ),
                            const SizedBox(width: 7),
                            Text(
                              _isAvailable ? "ONLINE" : "OFFLINE",
                              style: GoogleFonts.quicksand(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: _isAvailable
                                    ? VorianColors.primary
                                    : Colors.grey,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // ── Telemetry Row ─────────────────────────────────────
                Row(
                  children: [
                    _telemetryPill(
                      "VELOCIDAD",
                      "${_velocidadReal.toStringAsFixed(0)} km/h",
                      Icons.speed_rounded,
                    ),
                    const SizedBox(width: 10),
                    _telemetryPill(
                      "GPS",
                      _isAvailable
                          ? (_driverLocation != null ? "ACTIVO" : "BUSCANDO")
                          : "INACTIVO",
                      Icons.gps_fixed_rounded,
                      valueColor: _isAvailable && _driverLocation != null
                          ? VorianColors.green
                          : null,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _telemetryPill(String label, String value, IconData icon,
      {Color? valueColor}) {
    final bool isDark =
        MediaQuery.of(context).platformBrightness == Brightness.dark;
    final Color resolvedValueColor =
        valueColor ?? (isDark ? Colors.white : Colors.black);
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
        decoration: BoxDecoration(
          color: isDark ? VorianColors.white08 : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
              color: isDark
                  ? VorianColors.border
                  : Colors.black.withOpacity(0.04)),
        ),
        child: Row(
          children: [
            Icon(icon,
                size: 16,
                color: isDark ? VorianColors.white40 : Colors.black45),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: GoogleFonts.quicksand(
                        fontSize: 8,
                        color: isDark ? VorianColors.white40 : Colors.black45,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.8,
                      )),
                  Text(value,
                      style: GoogleFonts.quicksand(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: resolvedValueColor,
                      )),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFloatingBottomSheet() {
    return Positioned(
      bottom: 30,
      left: 15,
      right: 15,
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 300),
        child: _pedidoAsignado != null
            ? _buildPedidoCard(_pedidoAsignado!)
            : (_isAvailable && _ofertaDisponible != null)
                ? _buildOfertaCard(_ofertaDisponible!)
                : (_isAvailable
                    ? _buildEmptyStateCard()
                    : const SizedBox.shrink()),
      ),
    );
  }

  Widget _buildEmptyStateCard() {
    final bool isDark =
        MediaQuery.of(context).platformBrightness == Brightness.dark;
    return ClipRRect(
      borderRadius: BorderRadius.circular(28),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          key: const ValueKey('empty_state'),
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 28),
          decoration: BoxDecoration(
            color: isDark
                ? VorianColors.card.withOpacity(0.95)
                : Colors.white.withOpacity(0.92),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: VorianColors.border),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.5),
                blurRadius: 30,
                offset: const Offset(0, 12),
              )
            ],
          ),
          child: Column(
            children: [
              // ── Radar animation ──────────────────────────────────
              _RadarWidget(active: _isAvailable),
              const SizedBox(height: 20),
              Text(
                _isAvailable
                    ? "Buscando carga disponible…"
                    : "Turno finalizado",
                style: GoogleFonts.quicksand(
                  color: isDark ? Colors.white : Colors.black,
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                _isAvailable
                    ? "Las solicitudes aparecerán aquí cuando estén disponibles."
                    : "Activa tu turno para empezar a recibir envíos.",
                style: GoogleFonts.quicksand(
                  color: isDark ? VorianColors.white40 : Colors.black45,
                  fontSize: 13,
                  fontWeight: FontWeight.w400,
                ),
                textAlign: TextAlign.center,
              ),
              if (!_isAvailable) ...[
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: ElevatedButton.icon(
                    onPressed: () => _toggleOnline(true),
                    icon: const Icon(Icons.power_settings_new_rounded),
                    label: Text("INICIAR TURNO",
                        style: GoogleFonts.quicksand(
                            fontWeight: FontWeight.w900, letterSpacing: 1.1)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: VorianColors.green,
                      foregroundColor: VorianColors.ink,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPedidoCard(Map<String, dynamic> pedido) {
    final bool isDark =
        MediaQuery.of(context).platformBrightness == Brightness.dark;
    final String ref = pedido['reference'] ??
        (pedido['docId']?.toString().length != null &&
                pedido['docId'].toString().length >= 6
            ? pedido['docId'].toString().substring(0, 6).toUpperCase()
            : 'N/A');
    final String origin = pedido['pickup_address'] ??
        pedido['originAddress'] ??
        "Dirección de carga";
    final String destination = pedido['delivery_address'] ??
        pedido['destinationAddress'] ??
        "Dirección de entrega";

    return GestureDetector(
      onVerticalDragEnd: (details) {
        if (details.primaryVelocity != null && details.primaryVelocity! > 50) {
          setState(() => _isCardExpanded = false);
        } else if (details.primaryVelocity != null &&
            details.primaryVelocity! < -50) {
          setState(() => _isCardExpanded = true);
        }
      },
      onTap: () {
        if (!_isCardExpanded) setState(() => _isCardExpanded = true);
      },
      child: Container(
        clipBehavior: Clip.antiAlias,
        width: double.infinity,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(isDark ? 0.4 : 0.08),
              blurRadius: 35,
              spreadRadius: 2,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // ── Sección Superior (Blanca) ──────────────────────────────────
              Container(
                color: Colors.white,
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Handle
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        margin: const EdgeInsets.only(bottom: 20),
                        decoration: BoxDecoration(
                          color: Colors.black12,
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "Camión Asignado",
                                style: GoogleFonts.quicksand(
                                  fontSize: 24,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.black,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                "Conductor: $_driverName",
                                style: GoogleFonts.quicksand(
                                  fontSize: 14,
                                  color: Colors.grey.shade600,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 16),
                              Container(
                                width: 80,
                                height: 4,
                                decoration: BoxDecoration(
                                  color: Colors.blueAccent,
                                  borderRadius: BorderRadius.circular(2),
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                "Excelente reputación",
                                style: GoogleFonts.quicksand(
                                  fontSize: 12,
                                  color: Colors.grey.shade500,
                                ),
                              ),
                              const SizedBox(height: 16),
                              Row(
                                children: [
                                  Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        "#$ref",
                                        style: GoogleFonts.quicksand(
                                          fontSize: 18,
                                          fontWeight: FontWeight.w800,
                                          color: Colors.black,
                                        ),
                                      ),
                                      Text(
                                        "ID Viaje",
                                        style: GoogleFonts.quicksand(
                                          fontSize: 11,
                                          color: Colors.grey.shade500,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(width: 24),
                                  Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        pedido['status'] ?? "ACTIVO",
                                        style: GoogleFonts.quicksand(
                                          fontSize: 18,
                                          fontWeight: FontWeight.w800,
                                          color: Colors.black,
                                        ),
                                      ),
                                      Text(
                                        "Estado",
                                        style: GoogleFonts.quicksand(
                                          fontSize: 11,
                                          color: Colors.grey.shade500,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        // Big Image Placeholder
                        Icon(
                          Icons.local_shipping_rounded,
                          size: 100,
                          color: Colors.grey.shade300,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              // ── Sección Inferior (Oscura) ──────────────────────────────────
              if (_isCardExpanded)
                Container(
                  width: double.infinity,
                  color: isDark ? const Color(0xFF14141A) : const Color(0xFF1C1C1E),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 24, vertical: 24),
                  child: Column(
                    children: [
                      // Timeline Pick-up
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Column(
                            children: [
                              Container(
                                width: 12,
                                height: 12,
                                margin: const EdgeInsets.only(top: 4),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                      color: Colors.grey.shade800, width: 3),
                                ),
                              ),
                              Container(
                                width: 2,
                                height: 35,
                                color: Colors.grey.shade700,
                              ),
                            ],
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  "Punto de carga",
                                  style: GoogleFonts.quicksand(
                                    fontSize: 12,
                                    color: Colors.grey.shade500,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  origin,
                                  style: GoogleFonts.quicksand(
                                    fontSize: 14,
                                    color: Colors.white,
                                    fontWeight: FontWeight.w600,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      // Timeline Drop-off
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 12,
                            height: 12,
                            margin: const EdgeInsets.only(top: 4),
                            decoration: const BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.rectangle,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  "Punto de entrega",
                                  style: GoogleFonts.quicksand(
                                    fontSize: 12,
                                    color: Colors.grey.shade500,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  destination,
                                  style: GoogleFonts.quicksand(
                                    fontSize: 14,
                                    color: Colors.white,
                                    fontWeight: FontWeight.w600,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 32),
                      // Actions
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton(
                          onPressed: _iniciarRecorridoClick,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: Colors.black,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16)),
                            elevation: 0,
                          ),
                          child: Text(
                            "ACEPTAR E INICIAR",
                            style: GoogleFonts.quicksand(
                              fontWeight: FontWeight.w900,
                              fontSize: 15,
                              letterSpacing: 1.2,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
    );
  }

  Widget _buildOfertaCard(Map<String, dynamic> oferta) {
    final String ref = oferta['reference'] ??
        (oferta['docId']?.toString().length != null &&
                oferta['docId'].toString().length >= 6
            ? oferta['docId'].toString().substring(0, 6).toUpperCase()
            : 'N/A');
    final dynamic rawPrice =
        oferta['estimatedPrice'] ?? oferta['estimated_price'];
    final String priceStr = PriceEngine.formatearMoneda(rawPrice);
    
    final dynamic rawBoost = oferta['priority_boost'] ?? 0;
    final num boostAmount = rawBoost is num ? rawBoost : (num.tryParse(rawBoost.toString()) ?? 0);
    final bool hasBoost = boostAmount > 0;
 
    return ClipRRect(
      borderRadius: BorderRadius.circular(28),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: Container(
          key: const ValueKey('oferta_card'),
          padding: const EdgeInsets.fromLTRB(22, 20, 22, 24),
          decoration: BoxDecoration(
            color: const Color(0xE608090C), // Dark glassmorphic background
            borderRadius: BorderRadius.circular(28),
            border: Border.all(
              color: const Color(0xFF00FF66).withOpacity(0.35),
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF00FF66).withOpacity(0.08),
                blurRadius: 30,
                offset: const Offset(0, 8),
              ),
              BoxShadow(
                color: Colors.black.withOpacity(0.5),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Drag handle ────────────────────────────────
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 18),
                  decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
              // ── Header Row ────────────────────────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _PulsingChip(
                    label: "NUEVO VIAJE DISPONIBLE",
                    color: const Color(0xFF00FF66),
                  ),
                  Row(
                    children: [
                      Text(
                        "#$ref",
                        style: GoogleFonts.quicksand(
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                          color: Colors.white38,
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Circular Countdown Indicator
                      Stack(
                        alignment: Alignment.center,
                        children: [
                          SizedBox(
                            width: 32,
                            height: 32,
                            child: CircularProgressIndicator(
                              value: _ofertaSegundosRestantes / 30.0,
                              strokeWidth: 3,
                              backgroundColor: Colors.white12,
                              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF00FF66)),
                            ),
                          ),
                          Text(
                            "${_ofertaSegundosRestantes}s",
                            style: GoogleFonts.quicksand(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 18),
              // ── Price Banner ────────────────────────────────
              Container(
                width: double.infinity,
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFF0E1520),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white.withOpacity(0.04)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: const BoxDecoration(
                        color: Color(0x1A00FF66),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.monetization_on_rounded,
                          color: Color(0xFF00FF66), size: 24),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("Pago Estimado",
                            style: GoogleFonts.quicksand(
                              color: Colors.white60,
                              fontSize: 11,
                            )),
                        Text(priceStr,
                            style: GoogleFonts.quicksand(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                            )),
                      ],
                    ),
                    if (hasBoost) ...[
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.orange.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.orange.withOpacity(0.3)),
                        ),
                        child: Row(
                          children: [
                            const Text("🔥", style: TextStyle(fontSize: 14)),
                            const SizedBox(width: 4),
                            Text("BONO +${PriceEngine.formatearMoneda(boostAmount)}",
                              style: GoogleFonts.quicksand(
                                color: Colors.orange.shade300,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              )
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 20),
              // ── Route info ──────────────────────────────────────
              _infoRow(
                Icons.circle,
                "PUNTO DE ORIGEN",
                oferta['originAddress'] ??
                    oferta['pickup_address'] ??
                    "Dirección de carga",
                const Color(0xFF00FF66),
              ),
              Padding(
                padding: const EdgeInsets.only(left: 10, top: 4, bottom: 4),
                child: SizedBox(
                  height: 22,
                  child: LayoutBuilder(builder: (ctx, _) {
                    return Column(
                      children: List.generate(
                          4,
                          (i) => Container(
                                margin:
                                    const EdgeInsets.symmetric(vertical: 1.5),
                                width: 2,
                                height: 3,
                                color: Colors.white24,
                              )),
                    );
                  }),
                ),
              ),
              _infoRow(
                Icons.location_on_rounded,
                "DESTINO FINAL",
                oferta['destinationAddress'] ??
                    oferta['delivery_address'] ??
                    "Dirección de entrega",
                VorianColors.red,
              ),
              const SizedBox(height: 24),
              // ── Action Buttons ──────────────────────────────────────
              Row(
                children: [
                  GestureDetector(
                    onTap: _procesandoAceptacion
                        ? null
                        : () => _rechazarOferta(oferta['id']),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      child: Text(
                        "RECHAZAR",
                        style: GoogleFonts.quicksand(
                          color: Colors.white54,
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _procesandoAceptacion
                        ? Container(
                            height: 52,
                            decoration: BoxDecoration(
                              color: const Color(0xFF0E1520),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Center(
                              child: SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.white),
                              ),
                            ),
                          )
                        : SlideToConfirm(
                            key: ValueKey('accept_slide_${oferta['id']}'),
                            text: "DESLIZAR PARA ACEPTAR",
                            color: const Color(0xFF00FF66),
                            textColor: Colors.black,
                            onConfirmed: () => _aceptarOferta(oferta['id']),
                            height: 52,
                          ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value, Color iconColor) {
    final bool isDark =
        MediaQuery.of(context).platformBrightness == Brightness.dark;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: iconColor),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: GoogleFonts.quicksand(
                  color: isDark ? VorianColors.white40 : Colors.black45,
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                value,
                style: GoogleFonts.quicksand(
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                  color: isDark ? Colors.white : Colors.black,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _centrarMapaEnUsuario() async {
    try {
      geo.LocationPermission permission =
          await geo.Geolocator.checkPermission();
      if (permission == geo.LocationPermission.denied) {
        permission = await geo.Geolocator.requestPermission();
      }
      if (permission == geo.LocationPermission.denied ||
          permission == geo.LocationPermission.deniedForever) return;

      geo.Position pos = await geo.Geolocator.getCurrentPosition(
        desiredAccuracy: geo.LocationAccuracy.high,
      );

      await _mapboxMap?.setCamera(mb.CameraOptions(
        center: mb.Point(coordinates: mb.Position(pos.longitude, pos.latitude)),
        zoom: 14.0,
      ));
    } catch (e) {
      debugPrint("Error centrando mapa: $e");
    }
  }

  // _buildTopStatusBar eliminado (consolidado en _buildWazeShipmentPreview)

  Widget _buildMapSection() {
    final bool isDark = Theme.of(context).brightness == Brightness.dark ||
        MediaQuery.of(context).platformBrightness == Brightness.dark;
    
    final String styleId = isDark ? 'dark-v11' : 'light-v11';

    return mb.MapWidget(
      key: const ValueKey("mapboxMap"),
      styleUri: "mapbox://styles/mapbox/$styleId",
      onMapCreated: (mb.MapboxMap mapboxMap) async {
        _mapboxMap = mapboxMap;
        
        // Disable rotation gesture
        await mapboxMap.gestures.updateSettings(mb.GesturesSettings(
          rotateEnabled: false,
          pitchEnabled: false,
        ));
        
        // Restrict camera bounds to world to prevent infinite panning
        await mapboxMap.setBounds(mb.CameraBoundsOptions(
          bounds: mb.CoordinateBounds(
            southwest: mb.Point(coordinates: mb.Position(-180.0, -85.0)),
            northeast: mb.Point(coordinates: mb.Position(180.0, 85.0)),
            infiniteBounds: false,
          ),
          minZoom: 3.0,
          maxZoom: 18.0,
        ));

        // Create annotation managers
        _polylineAnnotationManager = await mapboxMap.annotations.createPolylineAnnotationManager();
        _pointAnnotationManager = await mapboxMap.annotations.createPointAnnotationManager();
        _circleAnnotationManager = await mapboxMap.annotations.createCircleAnnotationManager();

        // If location is already available, center map
        if (_driverLocation != null) {
          await mapboxMap.setCamera(mb.CameraOptions(
            center: mb.Point(coordinates: mb.Position(_driverLocation!.longitude, _driverLocation!.latitude)),
            zoom: 14.0,
          ));
          _updateDriverMarkerInMapbox();
        }
        
        // Draw active route if exists
        _trazarRutaEnMapbox();
      },
    );
  }

  void _mostrarMensajeMotivador({bool esFinDeTurno = false}) {
    final bool isDark =
        MediaQuery.of(context).platformBrightness == Brightness.dark;
    final List<String> frases = esFinDeTurno
        ? [
            "¡Gran jornada hoy! Gracias por tu esfuerzo. Descansa y recarga energías. 🌙"
          ]
        : [
            "¡Excelente trabajo! Entrega completada con éxito. 🚛",
            "¡Meta alcanzada! Eres una pieza clave en Vorian. 🌟",
            "¡Entrega finalizada! Tu compromiso mueve el mundo. 🌎",
            "¡Buen viaje! Estamos buscando tu próxima gran carga. 🔍"
          ];

    frases.shuffle();

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
        child: Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 20),
          child: Container(
            padding: const EdgeInsets.all(30),
            decoration: BoxDecoration(
              color: isDark ? VorianColors.surface : Colors.white,
              borderRadius: BorderRadius.circular(30),
              border: Border.all(color: Theme.of(context).colorScheme.primary.withOpacity(0.1)),
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 40)
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(15),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primary.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.check_circle_rounded,
                      color: Theme.of(context).colorScheme.primary, size: 40),
                ),
                const SizedBox(height: 24),
                Text(
                  esFinDeTurno ? "¡MUCHAS GRACIAS!" : "¡EXCELENTE TRABAJO!",
                  style: GoogleFonts.quicksand(
                      fontWeight: FontWeight.w900,
                      fontSize: 18,
                      letterSpacing: 1.5,
                      color: isDark ? Colors.white : Colors.black),
                ),
                const SizedBox(height: 14),
                Text(
                  frases.first,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.quicksand(
                      fontSize: 15,
                      color: isDark ? Colors.white70 : Colors.black54,
                      height: 1.5),
                ),
                const SizedBox(height: 30),
                SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    // Let the app_theme handle the styling colors, just define shape
                    style: ElevatedButton.styleFrom(
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                    child: Text("GRACIAS",
                        style: GoogleFonts.quicksand(
                            fontWeight: FontWeight.w900, letterSpacing: 1.2)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // --- 📸 LÓGICA DE POD (FOTOS Y FIRMAS) ---
  Future<void> _handlePhotoCapture() async {
    final ip.ImagePicker picker = ip.ImagePicker();
    final ip.XFile? photo =
        await picker.pickImage(source: ip.ImageSource.camera, imageQuality: 70);

    if (photo != null) {
      setState(() {
        if (_pedidoAsignado!['status'] == 'ARRIVED_AT_PICKUP') {
          _fotoRecogida = photo;
          _podRecogidaCompleto = true;
        } else {
          _fotoEntrega = photo;
          _podEntregaCompleto =
              (_firmaController != null && _firmaController!.isNotEmpty);
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Foto capturada con éxito.")));
    }
  }

  Future<void> _handleSignatureCapture() async {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(25)),
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        height: MediaQuery.of(context).size.height * 0.6,
        child: Column(
          children: [
            Text("FIRMA DEL CLIENTE",
                style: GoogleFonts.quicksand(
                    fontWeight: FontWeight.w900, color: Colors.black)),
            const SizedBox(height: 10),
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.shade300),
                    borderRadius: BorderRadius.circular(15)),
                child: Signature(
                    controller: _firmaController!,
                    backgroundColor: Colors.white),
              ),
            ),
            const SizedBox(height: 15),
            Row(
              children: [
                Expanded(
                    child: TextButton(
                        onPressed: () => _firmaController!.clear(),
                        child: const Text("Limpiar"))),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () async {
                      if (_firmaController!.isNotEmpty) {
                        Navigator.pop(context);
                        setState(() {
                          _podEntregaCompleto = (_fotoEntrega != null);
                        });
                        ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text("Firma registrada.")));
                      }
                    },
                    style: ElevatedButton.styleFrom(
                        backgroundColor: VorianColors.green,
                        foregroundColor: VorianColors.ink),
                    child: const Text("GUARDAR"),
                  ),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }
}

// ─── RADAR WIDGET ─────────────────────────────────────────────────────────────
class _RadarWidget extends StatefulWidget {
  final bool active;
  const _RadarWidget({required this.active});
  @override
  State<_RadarWidget> createState() => _RadarWidgetState();
}

class _RadarWidgetState extends State<_RadarWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final radarColor = VorianColors.pinkStrong;
    return SizedBox(
      width: 250,
      height: 250,
      child: AnimatedBuilder(
        animation: _ctrl,
        builder: (_, __) {
          return CustomPaint(
            size: const Size(250, 250),
            painter: _RadarPainter(
              progress: _ctrl.value,
              active: widget.active,
              color: radarColor,
            ),
          );
        },
      ),
    );
  }
}

class _RadarPainter extends CustomPainter {
  final double progress;
  final bool active;
  final Color color;
  _RadarPainter({required this.progress, required this.active, required this.color});

  @override
  void paint(ui.Canvas canvas, ui.Size size) {
    if (!active) return;

    final center = Offset(size.width / 2, size.height / 2);
    final maxR = size.width / 2;

    // 1. Dibujar 3 aros concéntricos expansivos que se desvanecen (con relleno suave)
    for (int i = 0; i < 3; i++) {
      double p = (progress + (i * 0.33)) % 1.0;
      
      final ringPaint = Paint()
        ..color = color.withOpacity((1 - p) * 0.4) // Más sutil
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.0;

      final fillPaint = Paint()
        ..color = color.withOpacity((1 - p) * 0.06) // Relleno de barrido ultra suave
        ..style = PaintingStyle.fill;
      
      double radius = maxR * p;
      if (radius > 12.0) {
        canvas.drawCircle(center, radius, fillPaint);
        canvas.drawCircle(center, radius, ringPaint);
      }
    }

    // 2. Línea de barrido de radar giratoria (sweep radar line)
    double sweepAngle = progress * 2 * math.pi;
    final sweepPaint = Paint()
      ..color = color.withOpacity(0.3)
      ..strokeWidth = 2.0;

    final sweepPoint = Offset(
      center.dx + (maxR - 15) * math.cos(sweepAngle),
      center.dy + (maxR - 15) * math.sin(sweepAngle),
    );
    canvas.drawLine(center, sweepPoint, sweepPaint);
  }

  @override
  bool shouldRepaint(_RadarPainter old) =>
      old.progress != progress || old.active != active;
}

// ─── PULSING CHIP ─────────────────────────────────────────────────────────────
class _PulsingChip extends StatefulWidget {
  final String label;
  final Color color;
  const _PulsingChip({required this.label, required this.color});
  @override
  State<_PulsingChip> createState() => _PulsingChipState();
}

class _PulsingChipState extends State<_PulsingChip>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
    _opacity = Tween(begin: 0.5, end: 1.0)
        .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _opacity,
      builder: (_, __) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: widget.color.withOpacity(0.12 * _opacity.value + 0.05),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
                color: widget.color.withOpacity(0.35 * _opacity.value)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 7,
                height: 7,
                decoration: BoxDecoration(
                  color: widget.color.withOpacity(_opacity.value),
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                        color: widget.color.withOpacity(0.5), blurRadius: 6)
                  ],
                ),
              ),
              const SizedBox(width: 7),
              Text(
                widget.label,
                style: GoogleFonts.quicksand(
                  color: widget.color,
                  fontWeight: FontWeight.w800,
                  fontSize: 10,
                  letterSpacing: 0.8,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class JumpingBoxMarkerWidget extends StatefulWidget {
  final Color color;
  const JumpingBoxMarkerWidget({super.key, required this.color});

  @override
  State<JumpingBoxMarkerWidget> createState() => _JumpingBoxMarkerWidgetState();
}

class _JumpingBoxMarkerWidgetState extends State<JumpingBoxMarkerWidget> with TickerProviderStateMixin {
  late AnimationController _jumpCtrl;
  late Animation<double> _jumpAnim;
  
  late AnimationController _pulseCtrl;

  @override
  void initState() {
    super.initState();
    _jumpCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 600))..repeat(reverse: true);
    _jumpAnim = Tween<double>(begin: 0.0, end: -20.0).animate(CurvedAnimation(parent: _jumpCtrl, curve: Curves.easeOut));
    
    _pulseCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 2000))..repeat();
  }

  @override
  void dispose() {
    _jumpCtrl.dispose();
    _pulseCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _pulseCtrl,
      builder: (context, _) {
        return AnimatedBuilder(
          animation: _jumpCtrl,
          builder: (context, _) {
            final pulseVal = _pulseCtrl.value;
            final pulseVal2 = (pulseVal + 0.5) % 1.0;
            return Stack(
              alignment: Alignment.center,
              children: [
                // Radar pulse 1
                Container(
                  width: 100 * pulseVal,
                  height: 100 * pulseVal,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: widget.color.withOpacity(1.0 - pulseVal),
                  ),
                ),
                // Radar pulse 2
                Container(
                  width: 100 * pulseVal2,
                  height: 100 * pulseVal2,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: widget.color.withOpacity(1.0 - pulseVal2),
                  ),
                ),
                
                // Dynamic shadow under the box
                Transform.translate(
                  offset: const Offset(0, 15),
                  child: Container(
                    width: 30 - (_jumpCtrl.value * 10),
                    height: 8,
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.3 - (_jumpCtrl.value * 0.15)),
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),

                // Jumping box container
                Transform.translate(
                  offset: Offset(0, _jumpAnim.value),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(color: widget.color.withOpacity(0.5), blurRadius: 10, offset: const Offset(0, 5))
                      ]
                    ),
                    child: Icon(
                      Icons.inventory_2, // Caja
                      color: widget.color,
                      size: 32,
                    ),
                  ),
                ),
              ],
            );
          }
        );
      }
    );
  }
}


