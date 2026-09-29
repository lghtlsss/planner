import 'package:flutter_test/flutter_test.dart';
import 'package:zametki/main.dart';

void main() {
  testWidgets('Приложение запускается', (WidgetTester tester) async {
    await tester.pumpWidget(const NotesApp());
    expect(find.text('Мои заметки'), findsOneWidget);
  });
}