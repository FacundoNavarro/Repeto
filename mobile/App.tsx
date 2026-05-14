import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen           from './src/screens/LoginScreen';
import RegisterScreen        from './src/screens/RegisterScreen';
import HomeScreen            from './src/screens/HomeScreen';
import StudyScreen           from './src/screens/StudyScreen';
import CategoriasScreen      from './src/screens/CategoriasScreen';
import DashboardScreen       from './src/screens/DashboardScreen';
import AgregarPalabrasScreen from './src/screens/AgregarPalabrasScreen';
import ModoLibreScreen       from './src/screens/ModoLibreScreen';
import { RootStackParamList, TabParamList } from './src/types';
import { C } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor:   C.accent,
        tabBarInactiveTintColor: C.textMid,
        headerStyle:      { backgroundColor: C.white },
        headerTitleStyle: { fontWeight: '700', color: C.text },
        tabBarStyle:      { backgroundColor: C.white, borderTopColor: C.track },
      }}
    >
      <Tab.Screen name="Home"      component={HomeScreen}       options={{ title: 'Inicio',      tabBarLabel: 'Inicio' }} />
      <Tab.Screen name="Categorias" component={CategoriasScreen} options={{ title: 'Categorías',  tabBarLabel: 'Categorías' }} />
      <Tab.Screen name="Dashboard"  component={DashboardScreen}  options={{ title: 'Mi progreso', tabBarLabel: 'Progreso' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState<'Login' | 'Main' | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('token').then(token => {
      setInitialRoute(token ? 'Main' : 'Login');
    });
  }, []);

  if (!initialRoute) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={C.accent} />
    </View>
  );

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login"    component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Main"     component={MainTabs} />
        <Stack.Screen
          name="Study"
          component={StudyScreen}
          options={{ headerShown: true, title: 'Sesión de estudio', headerBackTitle: 'Volver', headerStyle: { backgroundColor: C.white }, headerTintColor: C.accent }}
        />
        <Stack.Screen
          name="AgregarPalabras"
          component={AgregarPalabrasScreen}
          options={{ headerShown: true, title: 'Agregar palabras', headerBackTitle: 'Volver', headerStyle: { backgroundColor: C.white }, headerTintColor: C.accent }}
        />
        <Stack.Screen
          name="ModoLibre"
          component={ModoLibreScreen}
          options={{ headerShown: true, title: 'Modo Libre', headerBackTitle: 'Volver', headerStyle: { backgroundColor: C.white }, headerTintColor: C.orange }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
