# on Cable Received Number

Run some code when a data message comes across the cable.

```sig
network.onCableReceivedNumber(function (num: number) {
	
})
```

The cable receiver gets a data message sent from another board. The message is called a
_packet_. The packet has both the data from the sender and some other information used to help
transmit the data correctly between the boards. You only need to know what the program on the other
board wants to send you so your program just receives the _data_ part of the packet.

## Parameters

* **handler**: the [function](/types/function) that has the code to run when the cable data message is received.
This function takes 1 argument:
* ``num``: a single [number](/types/number) value from the sender.

## Example #example

Log the value of a number received from an cable data message to the console.

```blocks
network.onCableReceivedNumber(function (num) {
    console.logValue("cable-value", num)
})
```

## See also #seealso

[cable send number](/reference/network/cable-send-number)

```package
cable
```