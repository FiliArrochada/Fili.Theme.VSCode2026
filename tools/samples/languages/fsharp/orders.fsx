// An F# sample: modules, records, unions and pattern matching.
open System
open System.Collections.Generic

[<Literal>]
let MaxOrders = 100

type Status =
    | Pending
    | Shipped of date: DateTime

type Line = { Quantity: int; Price: decimal }

type Order(id: string) =
    let lines = List<Line>()
    member val Status = Pending with get, set
    member _.Id = id
    member this.Add(line: Line) = lines.Add line; this
    member _.Total = lines |> Seq.sumBy (fun l -> decimal l.Quantity * l.Price)

module Pricing =
    let mutable discount = 0.1m
    let apply (order: Order) = order.Total * (1m - discount)

let describe status =
    match status with
    | Pending -> "pending"
    | Shipped date when date > DateTime.Today -> sprintf "ships %O" date
    | Shipped _ -> $"shipped {MaxOrders}\t"

let order = Order("A-42").Add({ Quantity = 2; Price = 9.5m })
printfn "%s %M" (describe order.Status) (Pricing.apply order)
