namespace Fili.Langs.Cli;

public static class Program
{
    public static int Main()
    {
        var orders = new List<int> { 3, 5, 8 };
        var total = 0;
        foreach (var order in orders)
        {
            if (order > 4)
            {
                total += Weigh(order);
            }
        }

        Console.WriteLine(orders.Count + total);
        return 0;
    }

    private static int Weigh(int order)
    {
        var weight = order * 2;
        return weight + 1;
    }
}
