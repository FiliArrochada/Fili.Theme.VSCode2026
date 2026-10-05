namespace Fili.Samples.Orders;

internal static class Broken
{
    public static int Total() => missingValue + 1;
}
