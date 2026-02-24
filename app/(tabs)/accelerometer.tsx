import { supabase } from "@/lib/supabase";
import { Accelerometer, Gyroscope } from "expo-sensors";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function App() {
  const [{ x, y, z }, setData] = useState({ x: 0, y: 0, z: 0 });
  const [{ x: gx, y: gy, z: gz }, setGyroData] = useState({ x: 0, y: 0, z: 0 });

  const [subscription, setSubscription] = useState(null);
  const [gyroSubscription, setGyroSubscription] = useState(null);

  const dataRef = useRef<any[]>([]);
  const gyroDataRef = useRef<any[]>([]);
  const chunkSize = 100;

  function writeData(x: number, y: number, z: number, timestamp: number) {
    dataRef.current.push({ x, y, z, timestamp, date: Date.now() });
    if (dataRef.current.length > chunkSize) {
      const batch = [...dataRef.current];
      dataRef.current = [];
      (async () => {
        const { error } = await supabase.from("accel").insert(batch);
        if (error) console.error(error);
      })();
    }
  }

  function writeGyroData(x: number, y: number, z: number, timestamp: number) {
    gyroDataRef.current.push({ x, y, z, timestamp, date: Date.now() });
    if (gyroDataRef.current.length > chunkSize) {
      const batch = [...gyroDataRef.current];
      gyroDataRef.current = [];
      (async () => {
        const { error } = await supabase.from("gyro").insert(batch);
        if (error) console.error(error);
      })();
    }
  }

  const _subscribe = () => {
    const sub = Accelerometer.addListener((event) => {
      writeData(event.x, event.y, event.z, event.timestamp);
      setData(event);
    });
    setSubscription(sub);
  };

  const _unsubscribe = () => {
    subscription && subscription.remove();
    setSubscription(null);
  };

  const _subscribeGyro = () => {
    const sub = Gyroscope.addListener((event) => {
      writeGyroData(event.x, event.y, event.z, event.timestamp);
      setGyroData(event);
    });
    setGyroSubscription(sub);
  };

  const _unsubscribeGyro = () => {
    gyroSubscription && gyroSubscription.remove();
    setGyroSubscription(null);
  };

  const _slow = () => {
    Accelerometer.setUpdateInterval(1000);
    Gyroscope.setUpdateInterval(1000);
  };

  const _fast = () => {
    Accelerometer.setUpdateInterval(16);
    Gyroscope.setUpdateInterval(16);
  };

  const _toggleAll = () => {
    if (subscription) {
      _unsubscribe();
      _unsubscribeGyro();
    } else {
      _subscribe();
      _subscribeGyro();
    }
  };

  useEffect(() => {
    _subscribe();
    _subscribeGyro();
    return () => {
      _unsubscribe();
      _unsubscribeGyro();
      // Flush remaining accel data on unmount
      if (dataRef.current.length > 0) {
        supabase.from("accel").insert(dataRef.current);
        dataRef.current = [];
      }
      // Flush remaining gyro data on unmount
      if (gyroDataRef.current.length > 0) {
        supabase.from("gyro").insert(gyroDataRef.current);
        gyroDataRef.current = [];
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Accelerometer</Text>
      <Text style={styles.unit}>(gs, where 1g = 9.81 m/s²)</Text>
      <Text style={styles.text}>x: {x.toFixed(4)}</Text>
      <Text style={styles.text}>y: {y.toFixed(4)}</Text>
      <Text style={styles.text}>z: {z.toFixed(4)}</Text>

      <Text style={[styles.header, styles.sectionSpacing]}>Gyroscope</Text>
      <Text style={styles.unit}>(rad/s)</Text>
      <Text style={styles.text}>x: {gx.toFixed(4)}</Text>
      <Text style={styles.text}>y: {gy.toFixed(4)}</Text>
      <Text style={styles.text}>z: {gz.toFixed(4)}</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={_toggleAll} style={styles.button}>
          <Text>{subscription ? "On" : "Off"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={_slow}
          style={[styles.button, styles.middleButton]}
        >
          <Text>Slow</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={_fast} style={styles.button}>
          <Text>Fast</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  header: {
    textAlign: "center",
    fontWeight: "600",
    fontSize: 16,
  },
  unit: {
    textAlign: "center",
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  sectionSpacing: {
    marginTop: 24,
  },
  text: {
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: 24,
  },
  button: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eee",
    padding: 10,
  },
  middleButton: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#ccc",
  },
});
