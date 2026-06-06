import 'package:flutter/material.dart';

class ReservationScreen extends StatelessWidget {
  const ReservationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Table Reservations'),
        actions: [
          ElevatedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.add),
            label: const Text('New Reservation'),
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: Row(
        children: [
          // Mini Calendar
          Container(
            width: 300,
            color: Colors.grey.shade50,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Select Date', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                const SizedBox(height: 16),
                CalendarDatePicker(
                  initialDate: DateTime.now(),
                  firstDate: DateTime.now().subtract(const Duration(days: 30)),
                  lastDate: DateTime.now().add(const Duration(days: 365)),
                  onDateChanged: (date) {},
                ),
                const Divider(),
                const Text('Quick Filters', style: TextStyle(fontWeight: FontWeight.bold)),
                CheckboxListTile(title: const Text('Confirmed'), value: true, onChanged: (v) {}),
                CheckboxListTile(title: const Text('Pending'), value: true, onChanged: (v) {}),
              ],
            ),
          ),
          const VerticalDivider(width: 1),
          // Reservation List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: 5,
              itemBuilder: (context, index) {
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(16),
                    leading: CircleAvatar(
                      backgroundColor: Colors.blue.shade100,
                      child: const Icon(Icons.event_seat, color: Colors.blue),
                    ),
                    title: const Text('John Doe - Table T4', style: TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: const Text('Today at 7:30 PM • 4 Guests • Contact: +1 234 567 890'),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
                          onPressed: () {},
                          child: const Text('Seat Guest'),
                        ),
                        const SizedBox(width: 8),
                        IconButton(icon: const Icon(Icons.cancel, color: Colors.red), onPressed: () {}),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
