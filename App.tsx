import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { iniciarSesionPrincipal, obtenerEstadoAuth } from './src/native/AuthModule';

const COLOR = {
  primary: '#07612d',
  white: '#ffffff',
  textOnLight: '#1d1d1b',
  secondaryText: '#98a287',
  error: '#D32F2F',
  keyOverlay: 'rgba(255, 255, 255, 0.18)',
  keyBorder: 'rgba(255, 255, 255, 0.85)',
};

const PIN_MIN = 4;
const PIN_MAX = 6;
const PIN_KEY_ROWS: Array<Array<string>> = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['0', 'BORRAR'],
];

type ScreenMode = 'splash' | 'login' | 'authenticated';

function App() {
  const [mode, setMode] = useState<ScreenMode>('splash');
  const [loading, setLoading] = useState(true);
  const [primaryUserName, setPrimaryUserName] = useState('Administrador');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Carga del estado local de autenticacion para mantener flujo completamente offline.
    const loadAuthState = async () => {
      try {
        const status = await obtenerEstadoAuth();
        if (status.primaryUserName) {
          setPrimaryUserName(status.primaryUserName);
        }
      } catch {
        // Si no se puede leer estado, mantenemos defaults para no bloquear la vista.
      } finally {
        setLoading(false);
      }
    };

    loadAuthState();
  }, []);

  const pinIndicators = useMemo(() => {
    return Array.from({ length: PIN_MIN }, (_, index) => index < pin.length);
  }, [pin]);

  const onPressDigit = (digit: string) => {
    setError('');
    setPin(current => {
      if (current.length >= PIN_MAX) {
        return current;
      }
      return current + digit;
    });
  };

  const onPressDelete = () => {
    setError('');
    setPin(current => current.slice(0, -1));
  };

  const onSubmitPin = async () => {
    if (pin.length < PIN_MIN) {
      setError('El PIN debe tener minimo 4 digitos.');
      return;
    }

    try {
      const session = await iniciarSesionPrincipal(pin);
      setError('');
      setPin('');
      setMode('authenticated');
      Alert.alert('Acceso permitido', `Bienvenido ${session.name}.`);
    } catch (nativeError: any) {
      const message = nativeError?.message ?? 'PIN incorrecto. Intente de nuevo.';
      setError(message);
      setPin('');
    }
  };

  const renderSplash = () => {
    return (
      <SafeAreaView style={styles.splashSafeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLOR.primary} />
        <View style={styles.splashContainer}>
          <View style={styles.logoBadgeLight}>
            <Text style={styles.logoBadgeText}>A</Text>
          </View>

          <Text style={styles.splashTitle}>AgroApp</Text>
          <Text style={styles.splashSubtitle}>Gestion Ganadera Offline</Text>
          <Text style={styles.splashBody}>Bienvenido. Cree su PIN de seguridad de 4 digitos</Text>

          <View style={styles.progressRow}>
            {[0, 1, 2, 3].map(step => (
              <View key={step} style={[styles.progressDot, step === 0 && styles.progressDotActive]} />
            ))}
          </View>

          <Pressable onPress={() => setMode('login')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Continuar</Text>
          </Pressable>

          <Text style={styles.footerTextLight}>Sus datos nunca salen del dispositivo</Text>
        </View>
      </SafeAreaView>
    );
  };

  const renderLogin = () => {
    return (
      <SafeAreaView style={styles.loginSafeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLOR.primary} />
        <View style={styles.loginContainer}>
          <View style={styles.logoBadgeDark}>
            <Text style={[styles.logoBadgeText, styles.logoBadgeTextDark]}>A</Text>
          </View>

          <Text style={styles.loginTitle}>AgroApp</Text>
          <Text style={styles.loginSubtitle}>Ingrese su PIN</Text>
          <Text style={styles.loginUserLabel}>{primaryUserName}</Text>

          <View style={styles.indicatorRow}>
            {pinIndicators.map((filled, index) => (
              <View key={index} style={[styles.indicatorDot, filled && styles.indicatorDotFilled]} />
            ))}
          </View>

          {error ? (
            <View style={styles.errorPill}>
              <Text style={styles.errorText}>PIN incorrecto. Intente de nuevo.</Text>
            </View>
          ) : null}

          <View style={styles.keypad}>
            {PIN_KEY_ROWS.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.keyRow}>
                {row.map(key => {
                  const isDelete = key === 'BORRAR';
                  const isSingleZero = key === '0';
                  return (
                    <Pressable
                      key={key}
                      style={[styles.keyButton, isSingleZero && styles.keyButtonZero]}
                      onPress={() => (isDelete ? onPressDelete() : onPressDigit(key))}
                    >
                      <Text style={[styles.keyText, isDelete && styles.deleteKeyText]}>
                        {isDelete ? '<' : key}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          <Pressable style={styles.submitButton} onPress={onSubmitPin}>
            <Text style={styles.submitButtonText}>Ingresar</Text>
          </Pressable>

          <Text style={styles.footerTextDark}>Olvido su PIN? Contacte al administrador</Text>
        </View>
      </SafeAreaView>
    );
  };

  const renderAuthenticated = () => {
    return (
      <SafeAreaView style={styles.authenticatedSafeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLOR.white} />
        <View style={styles.authenticatedContainer}>
          <Text style={styles.authenticatedTitle}>Sesion iniciada</Text>
          <Text style={styles.authenticatedBody}>
            Login local exitoso. Ya puedes conectar esta pantalla con el menu principal del APK.
          </Text>
          <Pressable
            style={[styles.primaryButton, styles.authenticatedButton]}
            onPress={() => setMode('login')}
          >
            <Text style={styles.primaryButtonText}>Volver al Login</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderSafeArea}>
        <ActivityIndicator size="large" color={COLOR.primary} />
        <Text style={styles.loaderText}>Cargando autenticacion local...</Text>
      </SafeAreaView>
    );
  }

  if (mode === 'splash') return renderSplash();
  if (mode === 'login') return renderLogin();
  return renderAuthenticated();
}

const styles = StyleSheet.create({
  loaderSafeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: COLOR.white,
  },
  loaderText: {
    color: COLOR.textOnLight,
    fontSize: 14,
    fontWeight: '500',
  },
  splashSafeArea: {
    flex: 1,
    backgroundColor: COLOR.white,
  },
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoBadgeLight: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR.primary,
    marginBottom: 12,
  },
  logoBadgeDark: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLOR.white,
    marginBottom: 10,
  },
  logoBadgeText: {
    fontSize: 42,
    fontWeight: '700',
    color: COLOR.white,
  },
  logoBadgeTextDark: {
    color: COLOR.primary,
  },
  splashTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: COLOR.primary,
  },
  splashSubtitle: {
    marginTop: 2,
    fontSize: 17,
    color: COLOR.secondaryText,
    textAlign: 'center',
  },
  splashBody: {
    marginTop: 20,
    maxWidth: 290,
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 31,
    color: COLOR.textOnLight,
    fontWeight: '600',
  },
  progressRow: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 10,
  },
  progressDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#d7d7d7',
  },
  progressDotActive: {
    backgroundColor: COLOR.primary,
  },
  primaryButton: {
    marginTop: 26,
    minWidth: 210,
    borderRadius: 14,
    backgroundColor: COLOR.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: COLOR.white,
    fontSize: 14,
    fontWeight: '700',
  },
  footerTextLight: {
    position: 'absolute',
    bottom: 24,
    fontSize: 12,
    color: '#b5b5b5',
  },
  loginSafeArea: {
    flex: 1,
    backgroundColor: COLOR.primary,
  },
  loginContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 28,
  },
  loginTitle: {
    marginTop: 6,
    fontSize: 40,
    fontWeight: '800',
    color: COLOR.white,
  },
  loginSubtitle: {
    marginTop: 2,
    fontSize: 22,
    color: '#e7f6eb',
    fontWeight: '500',
  },
  loginUserLabel: {
    marginTop: 4,
    fontSize: 13,
    color: '#d7eddc',
  },
  indicatorRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },
  indicatorDot: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 1,
    borderColor: COLOR.white,
    backgroundColor: 'transparent',
  },
  indicatorDotFilled: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  errorPill: {
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: '#f9e7e7',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  errorText: {
    color: COLOR.error,
    fontSize: 12,
    fontWeight: '700',
  },
  keypad: {
    marginTop: 20,
    width: '100%',
    maxWidth: 320,
    gap: 10,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  keyButton: {
    width: 95,
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLOR.keyBorder,
    backgroundColor: COLOR.keyOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyButtonZero: {
    marginRight: 0,
  },
  keyText: {
    color: COLOR.white,
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 38,
  },
  deleteKeyText: {
    fontSize: 24,
  },
  submitButton: {
    marginTop: 20,
    minWidth: 240,
    borderRadius: 14,
    backgroundColor: COLOR.white,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    color: COLOR.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  footerTextDark: {
    position: 'absolute',
    bottom: 20,
    fontSize: 13,
    color: '#d8ead9',
    textDecorationLine: 'underline',
  },
  authenticatedSafeArea: {
    flex: 1,
    backgroundColor: COLOR.white,
  },
  authenticatedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  authenticatedTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: COLOR.primary,
  },
  authenticatedBody: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: COLOR.textOnLight,
    textAlign: 'center',
  },
  authenticatedButton: {
    marginTop: 18,
  },
});

export default App;
