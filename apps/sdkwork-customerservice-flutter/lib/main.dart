import 'package:flutter/material.dart';

void main() {
  runApp(const CustomerServiceFlutterApp());
}

class CustomerServiceFlutterApp extends StatelessWidget {
  const CustomerServiceFlutterApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SDKWork Customer Service',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
      ),
      home: const CustomerServiceHomePage(),
    );
  }
}

class CustomerServiceHomePage extends StatelessWidget {
  const CustomerServiceHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Customer Service')),
      body: const Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Flutter client scaffold',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
            ),
            SizedBox(height: 8),
            Text(
              'End-user ticket inbox and Goofish operator modules will consume '
              'generated app/backend SDKs in Phase 2.',
            ),
          ],
        ),
      ),
    );
  }
}
