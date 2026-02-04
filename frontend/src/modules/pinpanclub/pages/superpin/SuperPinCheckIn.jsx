/**
 * Super Pin Check-in Component
 * Componente para registro de presencia de jugadores
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  QrCode, MapPin, Hand, CheckCircle, XCircle, 
  Loader2, Users, Clock, ScanLine
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { QRCodeSVG } from 'qrcode.react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SuperPinCheckIn({ ligaId, leagueConfig, onCheckInComplete }) {
  const { t } = useTranslation();
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [checkInMethod, setCheckInMethod] = useState('manual');
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [geoStatus, setGeoStatus] = useState(null);
  const [qrCodeValue, setQrCodeValue] = useState('');

  // Get allowed check-in methods from league config
  const allowedMethods = leagueConfig?.checkin_config?.methods || ['manual'];

  useEffect(() => {
    fetchData();
  }, [ligaId]);

  const fetchData = async () => {
    try {
      const [availableRes, playersRes] = await Promise.all([
        fetch(`${API_URL}/api/pinpanclub/superpin/leagues/${ligaId}/available-players`),
        fetch(`${API_URL}/api/pinpanclub/players`)
      ]);

      const availableData = await availableRes.json();
      const playersData = await playersRes.json();

      setAvailablePlayers(availableData || []);
      setAllPlayers(playersData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheckIn = async () => {
    if (!selectedPlayer) return;
    
    setCheckingIn(true);
    try {
      const response = await fetch(
        `${API_URL}/api/pinpanclub/superpin/leagues/${ligaId}/checkin?jugador_id=${selectedPlayer}&method=manual`,
        { method: 'POST' }
      );

      if (response.ok) {
        await fetchData();
        setSelectedPlayer('');
        onCheckInComplete?.();
      }
    } catch (error) {
      console.error('Error checking in:', error);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleGeoCheckIn = async () => {
    if (!selectedPlayer) return;
    
    setGeoStatus('loading');
    
    if (!navigator.geolocation) {
      setGeoStatus('error');
      alert(t('superpin.checkin.geoNotSupported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setCheckingIn(true);
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `${API_URL}/api/pinpanclub/superpin/leagues/${ligaId}/checkin?jugador_id=${selectedPlayer}&method=geolocation&latitude=${latitude}&longitude=${longitude}`,
            { method: 'POST' }
          );

          if (response.ok) {
            setGeoStatus('success');
            await fetchData();
            setSelectedPlayer('');
            onCheckInComplete?.();
          } else {
            const error = await response.json();
            setGeoStatus('error');
            alert(error.detail || t('superpin.checkin.geoOutOfRange'));
          }
        } catch (error) {
          console.error('Error checking in with geo:', error);
          setGeoStatus('error');
        } finally {
          setCheckingIn(false);
        }
      },
      (error) => {
        setGeoStatus('error');
        alert(t('superpin.checkin.geoError'));
      },
      { enableHighAccuracy: true }
    );
  };

  const handleQrCheckIn = async (qrData) => {
    // QR code contains: SUPERPIN_CHECKIN:{liga_id}:{jugador_id}
    const parts = qrData.split(':');
    if (parts.length !== 3 || parts[0] !== 'SUPERPIN_CHECKIN' || parts[1] !== ligaId) {
      alert(t('superpin.checkin.invalidQr'));
      return;
    }

    const jugadorId = parts[2];
    setCheckingIn(true);
    try {
      const response = await fetch(
        `${API_URL}/api/pinpanclub/superpin/leagues/${ligaId}/checkin?jugador_id=${jugadorId}&method=qr_code&qr_code=${qrData}`,
        { method: 'POST' }
      );

      if (response.ok) {
        await fetchData();
        setShowQrScanner(false);
        onCheckInComplete?.();
      }
    } catch (error) {
      console.error('Error checking in with QR:', error);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async (jugadorId) => {
    try {
      await fetch(
        `${API_URL}/api/pinpanclub/superpin/leagues/${ligaId}/checkout?jugador_id=${jugadorId}`,
        { method: 'POST' }
      );
      await fetchData();
      onCheckInComplete?.();
    } catch (error) {
      console.error('Error checking out:', error);
    }
  };

  const generatePlayerQr = (jugadorId) => {
    return `SUPERPIN_CHECKIN:${ligaId}:${jugadorId}`;
  };

  // Filter out already checked-in players
  const checkedInIds = availablePlayers.map(p => p.jugador_id);
  const playersNotCheckedIn = allPlayers.filter(p => !checkedInIds.includes(p.jugador_id));

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Check-in Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            {t('superpin.checkin.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Method Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('superpin.checkin.method')}
            </label>
            <div className="flex gap-2 flex-wrap">
              {allowedMethods.includes('manual') && (
                <Button
                  type="button"
                  size="sm"
                  variant={checkInMethod === 'manual' ? 'default' : 'outline'}
                  onClick={() => setCheckInMethod('manual')}
                >
                  <Hand className="h-4 w-4 mr-1" /> {t('superpin.leagues.checkinManual')}
                </Button>
              )}
              {allowedMethods.includes('qr_code') && (
                <Button
                  type="button"
                  size="sm"
                  variant={checkInMethod === 'qr_code' ? 'default' : 'outline'}
                  onClick={() => setCheckInMethod('qr_code')}
                >
                  <QrCode className="h-4 w-4 mr-1" /> {t('superpin.leagues.checkinQr')}
                </Button>
              )}
              {allowedMethods.includes('geolocation') && (
                <Button
                  type="button"
                  size="sm"
                  variant={checkInMethod === 'geolocation' ? 'default' : 'outline'}
                  onClick={() => setCheckInMethod('geolocation')}
                >
                  <MapPin className="h-4 w-4 mr-1" /> {t('superpin.leagues.checkinGeo')}
                </Button>
              )}
            </div>
          </div>

          {/* Manual Check-in */}
          {checkInMethod === 'manual' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('superpin.players.selectPlayer')}
                </label>
                <select
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">{t('superpin.players.selectPlayer')}</option>
                  {playersNotCheckedIn.map((player) => (
                    <option key={player.jugador_id} value={player.jugador_id}>
                      {player.name} {player.apodo ? `"${player.apodo}"` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={handleManualCheckIn}
                disabled={!selectedPlayer || checkingIn}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {checkingIn ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                {t('superpin.checkin.checkIn')}
              </Button>
            </div>
          )}

          {/* QR Code Check-in */}
          {checkInMethod === 'qr_code' && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <ScanLine className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-4">{t('superpin.checkin.scanQrInstructions')}</p>
                
                {/* Player selection for generating QR */}
                <div className="mb-4">
                  <select
                    value={qrCodeValue}
                    onChange={(e) => setQrCodeValue(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">{t('superpin.checkin.selectForQr')}</option>
                    {playersNotCheckedIn.map((player) => (
                      <option key={player.jugador_id} value={player.jugador_id}>
                        {player.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Display QR code for selected player */}
                {qrCodeValue && (
                  <div className="bg-white p-4 rounded-lg inline-block">
                    <QRCodeSVG 
                      value={generatePlayerQr(qrCodeValue)} 
                      size={150}
                      level="M"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      {allPlayers.find(p => p.jugador_id === qrCodeValue)?.nombre}
                    </p>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => handleQrCheckIn(generatePlayerQr(qrCodeValue))}
                      disabled={checkingIn}
                    >
                      {checkingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : t('superpin.checkin.confirmQr')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Geolocation Check-in */}
          {checkInMethod === 'geolocation' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('superpin.players.selectPlayer')}
                </label>
                <select
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">{t('superpin.players.selectPlayer')}</option>
                  {playersNotCheckedIn.map((player) => (
                    <option key={player.jugador_id} value={player.jugador_id}>
                      {player.name} {player.apodo ? `"${player.apodo}"` : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <MapPin className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-4">{t('superpin.checkin.geoInstructions')}</p>
                
                {geoStatus === 'loading' && (
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('superpin.checkin.gettingLocation')}
                  </div>
                )}
                
                {geoStatus === 'success' && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-4 w-4 mr-1" /> {t('superpin.checkin.locationVerified')}
                  </Badge>
                )}
                
                {geoStatus === 'error' && (
                  <Badge className="bg-red-100 text-red-800">
                    <XCircle className="h-4 w-4 mr-1" /> {t('superpin.checkin.locationError')}
                  </Badge>
                )}
              </div>
              
              <Button
                onClick={handleGeoCheckIn}
                disabled={!selectedPlayer || checkingIn || geoStatus === 'loading'}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {checkingIn || geoStatus === 'loading' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <MapPin className="h-4 w-4 mr-2" />
                )}
                {t('superpin.checkin.verifyAndCheckIn')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checked-in Players */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            {t('superpin.checkin.presentPlayers')} ({availablePlayers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availablePlayers.length === 0 ? (
            <p className="text-center text-gray-500 py-4">{t('superpin.checkin.noPlayersCheckedIn')}</p>
          ) : (
            <div className="space-y-2">
              {availablePlayers.map((checkin) => (
                <div
                  key={checkin.checkin_id}
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      {checkin.jugador_info?.nombre?.[0] || '?'}
                    </div>
                    <div>
                      <p className="font-medium">{checkin.jugador_info?.nombre}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {new Date(checkin.checkin_time).toLocaleTimeString()}
                        <Badge className="bg-gray-100 text-gray-600 text-xs">
                          {checkin.method === 'manual' && <Hand className="h-3 w-3 mr-1" />}
                          {checkin.method === 'qr_code' && <QrCode className="h-3 w-3 mr-1" />}
                          {checkin.method === 'geolocation' && <MapPin className="h-3 w-3 mr-1" />}
                          {checkin.method}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => handleCheckOut(checkin.jugador_id)}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> {t('superpin.checkin.checkOut')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
