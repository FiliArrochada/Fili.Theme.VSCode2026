namespace Fili.Samples.Orders;

[System.Obsolete("x")]
public class ObsoleteOne { }

public class PlainOne { }

public sealed class SealedGen<T> { }

internal static class Uses
{
    public static object Make() => new ObsoleteOne();
}
