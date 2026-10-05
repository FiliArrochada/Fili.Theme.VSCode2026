Imports System.Collections.Generic

Module Program
    ' Sums the weights of the larger orders.
    Sub Main(args As String())
        Dim orders As New List(Of Integer) From {3, 5, 8}
        Dim total As Integer = 0
        For Each order As Integer In orders
            If order > 4 Then
                total += Weigh(order)
            End If
        Next
        Console.WriteLine($"Total: {total}")
    End Sub

    Private Function Weigh(order As Integer) As Integer
        Return order * 2 + 1
    End Function
End Module
